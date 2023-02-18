import {Workbox} from 'workbox-window';

let workBox;

let refreshing = false;

const isEdge = navigator.userAgent.indexOf("Edge") >= 0;

/**
 * Decode AVIF data using native browser's AV1 decoder.
 * It creates a video element, sets its src to the input, waits for the video to load, then draws the
 * video to a canvas and returns the canvas's image data
 * @param {ArrayBufferView | ArrayBuffer | Blob | string} arr - ArrayBufferView | ArrayBuffer | Blob |
 * string
 * @returns A promise that resolves to an object with a width, height, and data property.
 */
function decodeMov(arr: ArrayBufferView | ArrayBuffer | Blob | string) {
  const blob = new Blob([arr], {type: "video/mp4"});
  const blobURL = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const vid: HTMLVideoElement = document.createElement("video");
    vid.addEventListener(isEdge ? "ended" : "loadeddata", () => {
      if ((vid.mozDecodedFrames == null ||
          vid.mozDecodedFrames > 0)
        &&
        (vid.webkitDecodedFrameCount == null ||
          vid.webkitDecodedFrameCount > 0)) {
        resolve(vid);
      } else {
        reject(new Error("partial AV1 frame"));
      }
    });
    vid.addEventListener("error", () => {
      reject(new Error("cannot decode AV1 frame"));
    });
    vid.muted = true;
    vid.src = blobURL;
    vid.play();
  }).then(vid => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    c.width = vid.videoWidth;
    c.height = vid.videoHeight;
    ctx.drawImage(vid, 0, 0, c.width, c.height);
    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    return {
      width: c.width,
      height: c.height,
      data: imgData.data.buffer,
    }
  }).then(res => {
    URL.revokeObjectURL(blobURL);
    return res;
  }, err => {
    URL.revokeObjectURL(blobURL);
    throw err;
  });
}

/**
 * Respond to job requests from worker.
 * It receives a message from the service worker, decodes the AVIF image, and sends the decoded image
 * back to the service worker
 * @param {Event} e - Event - The event object that was passed to the worker.
 */
function handleMessage(e: Event) {
  const msg = e.data;
  if (msg && msg.type === "avif-mov") {
    decodeMov(msg.data).then(decoded => {
      navigator.serviceWorker.controller.postMessage({
        id: msg.id,
        type: "avif-rgba",
        ...decoded
      }, [decoded.data]);
    }, err => {
      navigator.serviceWorker.controller.postMessage({
        id: msg.id,
        type: "avif-error",
        data: err.message,
      });
    });
  }
}

/**
 * "If the browser can play a video with the codec av01.0.05M.08, then it supports AV1."
 *
 * The function is pretty simple. It creates a video element, and then checks if the browser can play a
 * video with the codec av01.0.05M.08. If it can, then it returns "probably". If it can't, then it
 * returns ""
 *
 * @returns A boolean value.
 */
function hasAv1Support(): boolean {
  const vid = document.createElement("video");
  return vid.canPlayType('video/mp4; codecs="av01.0.05M.08"') === "probably";
}

function getServiceWorkerOpts({forcePolyfill, wasmURL}) {
  const usePolyfill = forcePolyfill || !hasAv1Support();
  return {usePolyfill, wasmURL};
}

async function registerSW(url: string | TrustedScriptURL) {
  if ('serviceWorker' in navigator) {
    const { Workbox } = await import('workbox-window');

    workBox = new Workbox(url);

    return workBox.register();
  }
}
