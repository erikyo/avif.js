import { registerRoute, Route } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import {decodeAvif, setClientWaiting} from "./avif-service";

const avifCache = 'avifCacheV1';
// Pending tasks.
const taskById = {};
let taskCounter = 0;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(avifCache).then((cache) => {

    // Add all the assets in the array to the 'MyFancyCacheName_v1'
    // `Cache` instance for later use.
    return cache.addAll([
      '/dist/dav1d.wasm',
      '/service-worker.js',
      '/Mexico.avif'
    ]);
  }));
});

self.addEventListener('activate', (event) => {
  // Specify allowed cache keys
  const cacheAllowList = [avifCache];

  // Get all the currently active `Cache` instances.
  event.waitUntil(caches.keys().then((keys) => {
    // Delete all caches that aren't in the allow list:
    return Promise.all(keys.map((key) => {
      if (!cacheAllowList.includes(key)) {
        return caches.delete(key);
      }
    }));
  }));
});


// A new route that matches same-origin image requests and handles
// them with the cache-first, falling back to network strategy:
const imageRoute = new Route(({ request, sameOrigin }) => {
  return sameOrigin && request.destination === 'image'
}, new CacheFirst({
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200]
    })
  ]
}));

// Handle scripts:
const scriptsRoute = new Route(({ request }) => {
  return request.destination === 'script';
}, new CacheFirst({
  cacheName: 'scripts',
  plugins: [
    new ExpirationPlugin({
      maxEntries: 50,
    })
  ]
}));

// Handle styles:
const stylesRoute = new Route(({ request }) => {
  return request.destination === 'style';
}, new CacheFirst({
  cacheName: 'styles',
  plugins: [
    new ExpirationPlugin({
      maxEntries: 10,
    })
  ]
}));

// Register routes
registerRoute(imageRoute);
registerRoute(scriptsRoute);
registerRoute(stylesRoute);


self.addEventListener('message', async (message) => {
  switch (message) {
    // Client sent task request
    case "avif-task":
      const client = e.source;
      const id = msg.id;
      new Promise((resolve, reject) => {
        taskById[id] = {resolve, reject, toBlob: false};
        decodeAvif(client, id, msg.data);
      }).then(bmpArr => {
        delete taskById[id];
        client.postMessage({id, type: "avif-task", data: bmpArr}, [bmpArr]);
      }, err => {
        delete taskById[id];
        client.postMessage({id, type: "avif-error", data: err.message});
      });
      break;
  }
})

self.addEventListener('fetch', async (event) => {
  // Is this a request for an image?
  if (event.request.extension === 'avif') {

    const id = taskCounter++;

    setClientWaiting(event.clientId);

    event.respondWith(new Promise((resolve, reject) => {
      taskById[id] = {resolve, reject, toBlob: true};
      clients.get(event.clientId).then(client =>
        // TODO(Kagami): Apply request headers?
        fetch(event.request.url, {credentials: "same-origin"})
          .then(res => res.arrayBuffer())
          .then(avifArr => decodeAvif(client, id, avifArr))
      ).catch(reject);
    }).then(blob => {
      delete taskById[id];
      // TODO(Kagami): Apply response metadata?
      return new Response(blob);
    }, err => {
      delete taskById[id];
      throw err;
    }));

    // Open the cache
    event.respondWith(caches.open(avifCache).then((cache) => {
      // Respond with the image from the cache or from the network
      return cache.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request.url).then((fetchedResponse) => {
          // Add the network response to the cache for future visits.
          // Note: we need to make a copy of the response to save it in
          // the cache and use the original as the request response.
          cache.put(event.request, fetchedResponse.clone());

          // Return the network response
          return fetchedResponse;
        });
      });
    }));
  }
});
