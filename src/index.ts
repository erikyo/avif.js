import { decodeMov, getServiceWorkerOpts } from './decode'

// Respond to job requests from worker.
function handleMessage (event) {
  const msg = event.data
  if (msg && msg.type === 'avif-mov') {
    decodeMov(msg.data).then(decoded => {
      navigator.serviceWorker.controller.postMessage({
        id: msg.id,
        type: 'avif-rgba',
        ...decoded
      }, [decoded.data])
    }, err => {
      navigator.serviceWorker.controller.postMessage({
        id: msg.id,
        type: 'avif-error',
        data: err.message
      })
    })
  }
}

// See https://redfin.engineering/how-to-fix-the-refresh-button-when-using-service-workers-a8e27af6df68
// for the Service Worker update best practices.
async function register (regPromise: Promise<ServiceWorkerRegistration> | string, opts: { wasmURL?: string, scope?: string, onUpdate?: any, confirmUpdate?: any, forcePolyfill?: boolean }) {
  if (!('serviceWorker' in navigator)) {
    return await Promise.reject(new Error('Service Worker API is not supported'))
  }

  if (typeof opts === 'function') {
    opts = { confirmUpdate: opts }
  }
  opts = Object.assign({
    confirmUpdate: () => true,
    onUpdate: () => null,
    wasmURL: '/dist/dav1d.wasm',
    forcePolyfill: false,
    scope: './'
  }, opts)

  if (typeof regPromise === 'string') {
    const regOpts = opts.scope ? { scope: opts.scope } : undefined
    regPromise = navigator.serviceWorker.register(regPromise, regOpts)
  }

  await regPromise.then((reg: ServiceWorkerRegistration) => {

    let refreshing = false

    const refresh = () => {
      if (refreshing) return
      refreshing = true
      console('update ⚡')
      opts.onUpdate(reg)
    }
    const promptUserToRefresh = () => {
      Promise.resolve(opts.confirmUpdate(reg)).then(shouldUpdate => {
        if (shouldUpdate) {
          if (navigator.serviceWorker.controller != null) {
            navigator.serviceWorker.waiting.postMessage({ type: 'avif-update' })
          } else {
            refresh()
          }
        }
      })
    }

    const awaitStateChange = function () {
      const waitFor = (navigator.serviceWorker.controller != null) ? 'installed' : 'activated'
      navigator.serviceWorker.installing.addEventListener('statechange', function () {
        if (this.state === waitFor) promptUserToRefresh()
      })
    }

    navigator.serviceWorker.addEventListener('controllerchange', refresh)
    navigator.serviceWorker.addEventListener('message', handleMessage)
    if (navigator.serviceWorker.controller != null) {
      const swOpts = getServiceWorkerOpts(opts)
      navigator.serviceWorker.controller.postMessage({ type: 'avif-ready', data: swOpts })
    }

    if (navigator.serviceWorker.waiting) { promptUserToRefresh(); return }
    navigator.serviceWorker.addEventListener('updatefound', awaitStateChange)
  })
}

function swInit (options: { swUrl: string, wasmURL: string }) {
  register(navigator.serviceWorker.register(options.swUrl), {
    wasmURL: options.wasmURL
  })
}

export {
  swInit,
  handleMessage
}
