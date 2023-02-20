import { avif2mov, avif2obu } from './mov'
import { create } from 'dav1d.js'

// AV1 decoder context.
export let decoderContext = null

export function initPolyfill (opts) {
  if (!opts.usePolyfill) return Promise.resolve()
  return create({ wasmURL: opts.wasmURL }).then(d => {
    decoderContext = d
  })
}

export function arr2blob (bmpArr) {
  return new Blob([bmpArr], { type: 'image/png' })
}

export function nativeDecodeAvif (client, id, avifArr): Blob {
  const movArr = avif2mov(avifArr)
  client.postMessage({ id, type: 'avif-mov', data: movArr }, [movArr])
}

// Synchronous but that should be ok.
export function polyfillDecodeAvif (id, avifArr): Blob {
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

export function decodeAvif (client, id, avifArr): Blob {
  return decoderContext
    ? polyfillDecodeAvif(client, id, avifArr)
    : nativeDecodeAvif(client, id, avifArr)
}
