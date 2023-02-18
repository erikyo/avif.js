// Don't register the service worker
// until the page has fully loaded
window.addEventListener('load', () => {
  // Is service worker available?
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').then(() => {
      console.log('Service worker registered!');
    }).catch((error) => {
      console.warn('Error registering service worker:');
      console.warn(error);
    });
  }
});
