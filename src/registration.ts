export const isEdge = navigator.userAgent.includes('Edge')

/**
 * Registers the service worker.
 *
 * @param url
 * @return ServiceWorkerRegistration
 */
export async function registerSW (url: string) {
  if ('serviceWorker' in navigator) {
    // Register a service worker hosted at the root of the
    // site using the default scope.
    navigator.serviceWorker
      .register(url)
      .then((registration) => {
        console.log('Service worker registration succeeded:', registration)
        return registration
      })
      .catch((error) => {
        console.error(`Service worker registration failed: ${error}`)
      })
  } else {
    console.log('Service workers are not supported.')
  }
}
