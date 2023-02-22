import { avif2mov } from './mov'
import { rasterFormat } from './constants'

// Wait for client to become ready.
export const waitForClient = []

/**
 * It takes an array of bytes and returns a blob
 * @param bmpArr - the array of bytes that make up the BMP file
 * @returns A blob object.
 */
export function arr2blob (bmpArr) {
  return new Blob([bmpArr], { type: rasterFormat })
}

/**
 * It creates a promise that resolves immediately if it already exists, or creates a new promise that
 * resolves immediately if it doesn't exist
 * @param [cid=0] - The client ID of the client that is ready.
 */
export function setClientReady (cid = 0) {
  if (waitForClient[cid]) {
    waitForClient[cid].resolve()
  } else {
    waitForClient[cid] = { ready: Promise.resolve(), resolve: null }
  }
}

/**
 * It creates a promise that will be resolved when the client is ready
 * @param cid - The client ID of the client that is waiting.
 */
export function setClientWaiting (cid) {
  if (!waitForClient[cid]) {
    let resolve = null
    const ready = new Promise(res => { resolve = res })
    waitForClient[cid] = { ready, resolve }
  }
}

/**
 * It converts an AVIF file to a MOV file, and then sends the MOV file to the main thread
 * @param client - the worker client
 * @param id - The id of the message that was sent from the main thread.
 * @param avifArr - the Uint8Array of the AVIF file
 */
export function nativeDecodeAvif (client, id, avifArr): Blob {
  const movArr = avif2mov(avifArr)
  client.postMessage({ id, type: 'avif-mov', data: movArr }, [movArr])
}
