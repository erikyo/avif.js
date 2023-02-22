import { rgba2bmp } from './bmp'
import { arr2blob, setClientReady, setClientWaiting } from './avif-service'
import { decodeAvif, polyfillAvif } from './decode'

const CACHE_NAME = 'avifCache'
const CACHE_VERSION = 1
const CURRENT_CACHES = {
  AvifCache: `${CACHE_NAME}-V${CACHE_VERSION}`
}

// Pending tasks.
export const taskById: Array<{ resolve: Promise<boolean>, reject: PromiseRejectionEvent, toBlob: boolean }> = {}
export let taskCounter = 0

/**
 * It takes a taskId and a callback function, and if the taskId is valid, it calls the callback
 * function with the task's toBlob function as an argument
 * @param taskId - The id of the task.
 * @param cb - a callback function that takes a single parameter, which is a function that returns a
 * Blob.
 */
export function resolveTask (taskId, cb) {
  const task = taskById[taskId]
  if (task) {
    task.resolve(cb(task.toBlob))
  }
}

/**
 * It rejects a task by its id
 * @param taskId - The id of the task.
 * @param err - The error message to be passed to the reject function.
 */
export function rejectTask (taskId, err) {
  const task = taskById[taskId]
  if (task) {
    task.reject(err)
  }
}

/* A service worker event listener that is called when the service worker is installed. */
self.addEventListener('install', (event) => {
  // The promise that skipWaiting() returns can be safely ignored.
  self.skipWaiting()
})

/**
 * Cleaning up old caches.
 * The activate handler takes care of cleaning up old caches.
 */
self.addEventListener('activate', event => {
  const currentCaches = [CURRENT_CACHES]
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName))
    }).then(async cachesToDelete => {
      return await Promise.all(cachesToDelete.map(async cacheToDelete => {
        return await caches.delete(cacheToDelete)
      }))
    }).then(async () => { await self.clients.claim() })
  )
})

/* Listening for messages from the client. */
self.addEventListener('message', (event: MessageEvent) => {

  if (event.data === undefined) return

  // Handle job messages.
  const msg = event.data

  switch (msg.type) {
    // Client asks for our update
    case 'avif-update':
      self.skipWaiting()
      break

    // Client asks to activate us right away
    case 'avif-claim':
      clients.claim()
      break

    // Client asks to activate us right away
    case 'avif-unload':
      console.log('cleanup received!')
      caches.keys().then(async function (cacheNames) {
        return await Promise.all(
          cacheNames.map(async function (cacheName) {
            return await caches.delete(cacheName)
          })
        )
      })
      break

    // Client is ready
    case 'avif-replace':
      console.log(msg.data)
      polyfillAvif(msg.data).then(() => { setClientReady(event.source.id) })
      break

    // Client asks to activate us right away
    case 'uninstall':
      console.log('uninstall command received! bye bye!')
      self.sessionStorage.clear()
      break

    // Client sent task result
    case 'avif-rgba':
      const bmpArr = rgba2bmp(msg.data, msg.width, msg.height)
      resolveTask(msg.id, toBlob => toBlob ? arr2blob(bmpArr) : bmpArr)
      break

    // Client sent task error
    case 'avif-error':
      rejectTask(msg.id, new Error(msg.data))
      break

    // Client sent task request
    case 'avif-task':
      const client = event.source
      const id = msg.id
      new Promise((resolve, reject) => {
        taskById[id] = { resolve, reject, toBlob: false }
        console.log(msg.data);
        decodeAvif(client, id, msg.data)
      }).then(bmpArr => {
        delete taskById[id]
        client.postMessage({ id, type: 'avif-task', data: bmpArr }, [bmpArr])
      }, err => {
        delete taskById[id]
        client.postMessage({ id, type: 'avif-error', data: err.message })
      })
      break

    default:
      break
  }
})

/* A service worker event listener that is called when the service worker is installed. */
self.addEventListener('fetch', (event) => {
  console.log('Handling fetch event for', event.request.url)

  /**
   * if the requested file is an avif
   */
  if (event.request.url.match(/\.avif$/i)) {
    const id = taskCounter++
    setClientWaiting(event.clientId)

    /**
     * search in cache for that file
     */
    event.respondWith(
      caches
        .open(CURRENT_CACHES.AvifCache)
        .then(async (cache: Cache) => {
          return await cache.match(event.request)

            .then((cachedResponse: Response | undefined) => {
              console.log(event.request.url + (cachedResponse != null ? ' cached ' : ' not cached'))

              /**
             * return the file OR fetch network for the requested file
             */
              return (cachedResponse != null) || new Promise((resolve, reject) => {
                taskById[id] = { resolve, reject, toBlob: true }

                clients.get(event.clientId).then(async (client: Client | undefined) => {
                  return await fetch(event.request.clone(), { credentials: 'same-origin' })

                    .then(async res => await res.arrayBuffer())
                    .then((avifArr) => {
                      return decodeAvif(client, id, avifArr)
                    })
                })
                  .catch(reject)
              })
                .then((blob: Blob) => {
                  delete taskById[id]

                  cache.put(event.request.url + '.cache', new Response(blob))
                    .then(
                      () => { console.log(event.request.url + '.cache stored') }
                    )

                  return new Response(blob)
                }, err => {
                  delete taskById[id]
                  throw err
                })
            })
            .catch((error) => {
              console.error('  Error in fetch handler:', error)
              throw error
            })
        })
    )
  }
})
