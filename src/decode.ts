import { isEdge } from './registration'
import { hasAv1Support } from './supportDetection'

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

export function getServiceWorkerOpts ({ forcePolyfill, wasmURL }): { wasmURL: string, usePolyfill: boolean } {
  const usePolyfill = forcePolyfill || !hasAv1Support()
  return { usePolyfill, wasmURL }
}
