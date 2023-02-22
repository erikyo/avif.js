export const AVIF_SERVICE_WORKER_FILE = 'avif-sw.js'
export const rasterFormat = 'image/bmp'

export const avifPolyfillOptions = {
  onUpdate: () => null,
  swURL: AVIF_SERVICE_WORKER_FILE,
  wasmURL: '/dist/dav1d.wasm',
  forcePolyfill: false,
  scope: '/'
}
