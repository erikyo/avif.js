import { isEdge } from './registration'
import { hasAv1Support } from './supportDetection'
import { avif2obu } from './mov'
import { arr2blob, nativeDecodeAvif, waitForClient } from './avif-service'
import { resolveTask } from './avif-sw'
import { create } from 'dav1d.js'

// AV1 decoder context.
export let decoderContext = null

/**
 * Decode AVIF data using native browser's AV1 decoder.
 * It creates a video element, sets its src to the input, waits for the video to load, then draws the
 * video to a canvas and returns the canvas's image data
 * @param {ArrayBufferView | ArrayBuffer | Blob | string} arr - ArrayBufferView | ArrayBuffer | Blob |
 * string
 * @returns A promise that resolves to an object with a width, height, and data property.
 */
export async function decodeMov (arr: ArrayBufferView | ArrayBuffer | Blob | string) {
  const blob = new Blob([arr], { type: 'video/mp4' })
  const blobURL = URL.createObjectURL(blob)
  return await new Promise((resolve, reject) => {
    const vid: HTMLVideoElement = document.createElement('video')
    vid.addEventListener(isEdge ? 'ended' : 'loadeddata', () => {
      if ((vid.mozDecodedFrames == null ||
          vid.mozDecodedFrames > 0) &&
        (vid.webkitDecodedFrameCount == null ||
          vid.webkitDecodedFrameCount > 0)) {
        resolve(vid)
      } else {
        reject(new Error('partial AV1 frame'))
      }
    })
    vid.addEventListener('error', () => {
      reject(new Error('cannot decode AV1 frame'))
    })
    vid.muted = true
    vid.src = blobURL
    vid.play()
  }).then(vid => {
    /**
     * maybe a separate function since is widely used
     */

    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')
    c.width = vid.videoWidth
    c.height = vid.videoHeight
    ctx.drawImage(vid, 0, 0, c.width, c.height)
    const imgData = ctx.getImageData(0, 0, c.width, c.height)
    return {
      width: c.width,
      height: c.height,
      data: imgData.data.buffer
    }
  }).then(res => {
    URL.revokeObjectURL(blobURL)
    return res
  }, err => {
    URL.revokeObjectURL(blobURL)
    throw err
  })
}


/**
 * It takes an AVIF array, converts it to an OBU array, decodes the OBU array to a BMP array, and
 * returns the BMP array
 * @param client - the client object that was passed to the worker.
 * @param id - The id of the task.
 * @param avifArr - The AVIF data as a Uint8Array.
 */
export function polyfillDecodeAvif (client, id, avifArr) {
  const obuArr = avif2obu(avifArr).data
  resolveTask(id, toBlob => {
    if (toBlob) {
      // console.time("dav1d "+id);
      const bmpArr = decoderContext.unsafeDecodeFrameAsBMP(obuArr)
      // console.timeEnd("dav1d "+id);
      const blob = arr2blob(bmpArr)
      decoderContext.unsafeCleanup()
      return blob
    } else {
      // Will be transfered so ok to copy.
      return decoderContext.decodeFrameAsBMP(obuArr)
    }
  })
}

/**
 * It creates a new decoder context, and then sets the client ready flag
 * @param opts - {
 * @returns A promise that resolves to the decoderContext.
 */
export function polyfillAvif (opts) {
  return create({ wasmURL: opts.wasmURL })
    .then((decoder) => {
      decoderContext = decoder
    })
}

/**
 * If the browser supports the AVIF decoder, use it, otherwise use the polyfill
 * @param client - The client object that was passed to the worker.
 * @param id - The id of the image to decode.
 * @param avifArr - The Uint8Array of the AVIF file.
 * @returns A promise that resolves to an image object.
 */
export function decodeAvif (client, id, avifArr) {
  console.log(waitForClient[client.id])
  return waitForClient[client.id].ready.then(() => {
    decoderContext
      ? polyfillDecodeAvif(client, id, avifArr)
      : nativeDecodeAvif(client, id, avifArr)
  })
}

/**
 * If the user's browser doesn't support AV1, we'll use the polyfill. Otherwise, we'll use the native
 * decoder
 * @param  - `forcePolyfill` - if true, the polyfill will be used even if the browser supports AV1.
 */
export function getServiceWorkerOpts ({ forcePolyfill, wasmURL }: { wasmURL: string, forcePolyfill: boolean }) {
  const usePolyfill = forcePolyfill || !hasAv1Support()
  return { usePolyfill, wasmURL }
}

/**
 * It takes a string, splits it on the forward slash character, and returns the last item in the
 * resulting array
 * @param uri - The URI of the file to be downloaded.
 * @returns The last item in the array.
 */
export function getFilename (uri) {
  return uri.split('/').pop()
}

/**
 * It takes a Blob and returns a new Blob with the same image data but a different file format
 * @param imageBlob - The Blob object you want to convert
 * @param mime - The MIME type of the new Blob.
 * @returns A new Blob object
 */
function blobToBlob (imageBlob, mime): Blob {
  const canvas = self.createElement('canvas')
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
