import { decodeMov, getFilename, getServiceWorkerOpts } from './decode'
import { detectAvifSupport } from './supportDetection'
import { inspect } from 'util'
import defaultOptions = module
import { AVIF_SERVICE_WORKER_FILE } from './constants'

/**
 * It receives a message from the service worker, decodes the message, and sends the decoded message
 * back to the service worker
 * @param event - The event object that was passed to the event handler.
 */
function handleMessage (event) {
  // Respond to job requests from worker.
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
async function register (
  regPromise: string,
  opts: AvifPolyfillOptions
) {
  opts = { ...defaultOptions, ...opts }

  console.log('initialized with options', opts)

  if (!('serviceWorker' in navigator)) {
    return await Promise.reject('SERVICE_WORKER_NOT_SUPPORTED')
  } else if (opts.avifSupport) {
    return await Promise.reject('AVIF_SUPPORTED')
  } else if (typeof opts.swURL === 'string') {
    /**
     * Service Worker registration
     */
    navigator.serviceWorker
      .register(opts.swURL, { scope: opts.scope })
      .then((reg: ServiceWorkerRegistration) => {
        /**
         * It calls the `onUpdate` function that was passed in as an option, and then it returns the
         * `forceReload` function
         *
         * @param event - The event object
         */
        const refresh = (event) => {
          console.log('update ⚡', event)
          opts.onUpdate(() => forceReload)
        }

        /**
         * It sends a message to the service worker to update the image sources
         */
        const forceReload: (reg, options) => void = () => {
          console.log('🔁 starting Image sources replace')
          reg.waiting.postMessage({
            type: 'avif-update',
            data: getServiceWorkerOpts(opts)
          })
        }

        /**
         * If the service worker is already installed, force a reload. If it's not installed, wait for it to
         * install and then force a reload
         */
        const awaitStateChange: () => void = () => {
          const waitFor = (navigator.serviceWorker.controller != null) ? 'installed' : 'activated'
          reg.installing.addEventListener('statechange', function () {
            if (this.state === waitFor) forceReload(reg)
          })
        }

        /**
         * Events
         *
         * Fire avif replace on init
         */
        if (reg.active != null) {
          console.log('🙌 Ready for replace!')
          const swOpts = getServiceWorkerOpts(opts)
          reg.active.postMessage({ type: 'avif-replace', data: swOpts })
        }

        /**
         *  Reload images src
         */
        if (reg.waiting != null) {
          // TODO: IF IT NEEDS TO BE RELOADED... force reload
          console.log('⚒️ Force Reload')
          forceReload(reg, opts)
        }

        /**
         * The controllerchange event of the ServiceWorkerContainer interface fires
         * when the document's associated ServiceWorkerRegistration acquires a new active worker.
         */
        navigator.serviceWorker.addEventListener('controllerchange', refresh)

        /* Receive an input from Service Worker */
        navigator.serviceWorker.addEventListener('message', handleMessage)

        /* A new service worker has been installed */
        navigator.serviceWorker.addEventListener('updatefound', awaitStateChange)

        return reg
      })
  }
}

/**
 * If the browser doesn't support AVIF, register the service worker. If the browser does support AVIF,
 * unregister the service worker
 * @param options - {
 */
async function swInit (options): void {
  const needsPolyfill = await detectAvifSupport()
  if (!needsPolyfill) {
    register(options.swURL, options)
      .then(() => {
        console.log('Success! Service Worker installed ✌️')
      })
      .catch((err) => {
        if (err === 'AVIF_SUPPORTED') {
          console.log('Avif Image format supported by browser 🎉 - polyfill disabled')
          return
        }
        console.log('Error ', err)
      })
  } else {
    const currentSw = navigator.serviceWorker?.controller?.scriptURL
    if (currentSw && getFilename(currentSw) === AVIF_SERVICE_WORKER_FILE) {
      console.log('Cleanup 🧽')
      navigator.serviceWorker.getRegistrations()
        .then(registrations => {
          for (const registration of registrations) {
            if (getFilename(registration?.active?.scriptURL) === AVIF_SERVICE_WORKER_FILE) {
              registration.unregister().then(() => {
                console.log('avif service worker uninstalled')
              })
            }
          }
        })
    }
  }
}

export {
  swInit,
  handleMessage
}
