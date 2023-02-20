import { rgba2bmp } from './bmp'
import { avif2obu } from './mov'
import { arr2blob, initPolyfill, nativeDecodeAvif } from './avif-service'

const CACHE_NAME = 'avifCache'
const CACHE_VERSION = 1
const CURRENT_CACHES = {
  AvifCache: `${CACHE_NAME}-V${CACHE_VERSION}`
}

// Wait for client to become ready.
export const waitForClient = {}

// Pending tasks.
export const taskById = {}
export let taskCounter = 0

// AV1 decoder context.
export const dCtx = null

function setClientReady (cid) {
  if (waitForClient[cid]) {
    waitForClient[cid].resolve()
  } else {
    waitForClient[cid] = { ready: Promise.resolve(), resolve: null }
  }
}

function setClientWaiting (cid) {
  if (!waitForClient[cid]) {
    let resolve = null
    const ready = new Promise(res => { resolve = res })
    waitForClient[cid] = { ready, resolve }
  }
}

function resolveTask (taskId, cb) {
  const task = taskById[taskId]
  if (task) {
    task.resolve(cb(task.toBlob))
  }
}

function rejectTask (taskId, err) {
  const task = taskById[taskId]
  if (task) {
    task.reject(err)
  }
}

// Synchronous but that should be ok.
function polyfillDecodeAvif (client, id, avifArr) {
  const obuArr = avif2obu(avifArr).data
  resolveTask(id, toBlob => {
    if (toBlob) {
      // console.time("dav1d "+id);
      const bmpArr = dCtx.unsafeDecodeFrameAsBMP(obuArr)
      // console.timeEnd("dav1d "+id);
      const blob = arr2blob(bmpArr)
      dCtx.unsafeCleanup()
      return blob
    } else {
      // Will be transfered so ok to copy.
      return dCtx.decodeFrameAsBMP(obuArr)
    }
  })
}

function decodeAvif (client, id, avifArr) {
  return waitForClient[client.id].ready.then(() => {
    dCtx
      ? polyfillDecodeAvif(client, id, avifArr)
      : nativeDecodeAvif(client, id, avifArr)
  })
}

self.addEventListener('install', (event) => {
  // The promise that skipWaiting() returns can be safely ignored.
  self.skipWaiting()
})

// The activate handler takes care of cleaning up old caches.
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

// Handle job messages.
self.addEventListener('message', e => {
  const msg = e.data
  if (!msg) return

  switch (msg.type) {
    // Client asks for our update
    case 'avif-update':
      self.skipWaiting()
      break

    // Client asks to activate us right away
    case 'avif-claim':
      clients.claim()
      break

    // Client is ready
    case 'avif-ready':
      initPolyfill(msg.data).then(() => { setClientReady(e.source.id) })
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
      const client = e.source
      const id = msg.id
      new Promise((resolve, reject) => {
        taskById[id] = { resolve, reject, toBlob: false }
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

// This function is used to convert base64 encoding to mime type (blob)
function blobToBlob (imageBlob, mime): Blob {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  let newBlob

  // Create a new Image object and set its source to the Blob URL
  const img = new Image()
  img.src = URL.createObjectURL(imageBlob)

  // When the image has loaded, draw it onto the canvas with the desired file format
  img.onload = function () {
    canvas.width = img.width
    canvas.height = img.height
    context.drawImage(img, 0, 0)

    // Convert the canvas to a new Blob with the desired file format
    canvas.toBlob(function (nb) {
      newBlob = nb
    }, mime)
  }

  return newBlob
}

self.addEventListener('fetch', (event) => {
  console.log('Handling fetch event for', event.request.url)

  if (event.request.url.match(/\.avif$/i)) {
    const id = taskCounter++
    setClientWaiting(event.clientId)

    event.respondWith(caches.open(CURRENT_CACHES.AvifCache)
      .then(async (cache: Cache) => {
        return await cache.match(event.request)
          .then((cachedResponse: Response | undefined) => {
            console.log(event.request)
            return (cachedResponse != null) || new Promise((resolve, reject) => {
              taskById[id] = { resolve, reject, toBlob: true }

              clients.get(event.clientId).then(async (client: Client) => {
                return await fetch(event.request.url, { credentials: 'same-origin' })
                  .then(async res => await res.arrayBuffer())
                  .then(avifArr => decodeAvif(client, id, avifArr))
              }).catch(reject)
            })
              .then((blob: Blob) => {
                delete taskById[id]
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
