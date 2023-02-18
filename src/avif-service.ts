import {avif2mov, avif2obu} from "./mov";
import {rgba2bmp} from "./bmp";
import {create} from "dav1d.js";

// Wait for client to become ready.
const waitForClient = {};

// Pending tasks.
const taskById = {};
let taskCounter = 0;

// AV1 decoder context.
let dCtx = null;

export function initPolyfill(opts) {
  if (!opts.usePolyfill) return Promise.resolve();
  return create({wasmURL: opts.wasmURL}).then(d => {
    dCtx = d;
  });
}

export function setClientReady(cid) {
  if (waitForClient[cid]) {
    waitForClient[cid].resolve();
  } else {
    waitForClient[cid] = {ready: Promise.resolve(), resolve: null};
  }
}

export function setClientWaiting(cid: number) {
  if (!waitForClient[cid]) {
    let resolve = null;
    let ready = new Promise(res => { resolve = res; });
    waitForClient[cid] = {ready, resolve};
  }
}

export function resolveTask(taskId, cb) {
  const task = taskById[taskId];
  if (task) {
    task.resolve(cb(task.toBlob));
  }
}

export function rejectTask(taskId: number, err: any) {
  const task = taskById[taskId];
  if (task) {
    task.reject(err);
  }
}

export function arr2blob(bmpArr) {
  return new Blob([bmpArr], {type: "image/bmp"});
}

export function nativeDecodeAvif(client, id, avifArr) {
  const movArr = avif2mov(avifArr);
  client.postMessage({id, type: "avif-mov", data: movArr}, [movArr]);
}

// Synchronous but that should be ok.
export function polyfillDecodeAvif(client, id, avifArr) {
  const obuArr = avif2obu(avifArr).data;
  resolveTask(id, toBlob => {
    if (toBlob) {
      // console.time("dav1d "+id);
      const bmpArr = dCtx.unsafeDecodeFrameAsBMP(obuArr);
      // console.timeEnd("dav1d "+id);
      const blob = arr2blob(bmpArr);
      dCtx.unsafeCleanup();
      return blob;
    } else {
      // Will be transfered so ok to copy.
      return dCtx.decodeFrameAsBMP(obuArr);
    }
  });
}

export function decodeAvif(client, id, avifArr) {
  return waitForClient[client.id].ready.then(() => {
    return dCtx ? polyfillDecodeAvif(client, id, avifArr)
      : nativeDecodeAvif(client, id, avifArr);
  });
}
