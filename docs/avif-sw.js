/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/dav1d.js/dav1d.js":
/*!****************************************!*\
  !*** ./node_modules/dav1d.js/dav1d.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "create": () => (/* binding */ create)
/* harmony export */ });
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
// Must be in sync with emcc settings!
var TOTAL_MEMORY = 64 * 1024 * 1024; // TODO(Kagami): Find optimal amount
var TOTAL_STACK = 5626096; // TODO(Kagami): Find why bigger than 5MB
var PAGE_SIZE = 64 * 1024;
var TABLE_SIZE = 271; // NOTE(Kagami): Depends on the number of
// function pointers in target library, seems
// like no way to know in general case

function getRuntime() {
  var dynamicTop = TOTAL_STACK;
  var table = new WebAssembly.Table({
    initial: TABLE_SIZE,
    maximum: TABLE_SIZE,
    element: "anyfunc"
  });
  var memory = new WebAssembly.Memory({
    initial: TOTAL_MEMORY / PAGE_SIZE,
    maximum: TOTAL_MEMORY / PAGE_SIZE
  });
  var HEAPU8 = new Uint8Array(memory.buffer);
  return {
    table: table,
    memory: memory,
    sbrk: function sbrk(increment) {
      var oldDynamicTop = dynamicTop;
      dynamicTop += increment;
      return oldDynamicTop;
    },
    emscripten_memcpy_big: function emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    },
    // Empty stubs for dav1d.
    pthread_cond_wait: function pthread_cond_wait(cond, mutex) {
      return 0;
    },
    pthread_cond_signal: function pthread_cond_signal(cond) {
      return 0;
    },
    pthread_cond_destroy: function pthread_cond_destroy(cond) {
      return 0;
    },
    pthread_cond_init: function pthread_cond_init(cond, attr) {
      return 0;
    },
    pthread_cond_broadcast: function pthread_cond_broadcast(cond) {
      return 0;
    },
    pthread_join: function pthread_join(thread, res) {
      return 0;
    },
    pthread_create: function pthread_create(thread, attr, func, arg) {
      return 0;
    }
    // Emscripten debug.
    // abort: () => {},
    // __lock: () => {},
    // __unlock: () => {},
    // djs_log: (msg) => console.log(msg),
  };
}

function fetchAndInstantiate(data, url, imports) {
  if (data) return WebAssembly.instantiate(data, imports);
  var req = fetch(url, {
    credentials: "same-origin"
  });
  if (WebAssembly.instantiateStreaming) {
    return WebAssembly.instantiateStreaming(req, imports);
  } else {
    return req.then(function (res) {
      return res.arrayBuffer();
    }).then(function (data) {
      return WebAssembly.instantiate(data, imports);
    });
  }
}
function create() {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (!opts.wasmURL && !opts.wasmData) {
    return Promise.reject(new Error("Either wasmURL or wasmData shall be provided"));
  }
  var runtime = getRuntime();
  var imports = {
    env: runtime
  };
  return fetchAndInstantiate(opts.wasmData, opts.wasmURL, imports).then(function (wasm) {
    var d = new Dav1d({
      wasm: wasm,
      runtime: runtime
    });
    d._init();
    return d;
  });
}
var DJS_FORMAT_YUV = 0;
var DJS_FORMAT_BMP = 1;
var Dav1d = /*#__PURE__*/function () {
  /* Private methods, shall not be used */

  function Dav1d(_ref) {
    var wasm = _ref.wasm,
      runtime = _ref.runtime;
    _classCallCheck(this, Dav1d);
    this.FFI = wasm.instance.exports;
    this.buffer = runtime.memory.buffer;
    this.HEAPU8 = new Uint8Array(this.buffer);
    this.ref = null;
    this.lastFrameRef = null;
  }
  _createClass(Dav1d, [{
    key: "_init",
    value: function _init() {
      this.ref = this.FFI.djs_init();
      if (!this.ref) throw new Error("error in djs_init");
    }
  }, {
    key: "_decodeFrame",
    value: function _decodeFrame(obu, format, unsafe) {
      if (!ArrayBuffer.isView(obu)) {
        obu = new Uint8Array(obu);
      }
      var obuRef = this.FFI.djs_alloc_obu(obu.byteLength);
      if (!obuRef) throw new Error("error in djs_alloc_obu");
      this.HEAPU8.set(obu, obuRef);
      var frameRef = this.FFI.djs_decode_obu(this.ref, obuRef, obu.byteLength, format);
      if (!frameRef) throw new Error("error in djs_decode");
      var frameInfo = new Uint32Array(this.buffer, frameRef, 4);
      var width = frameInfo[0];
      var height = frameInfo[1];
      var size = frameInfo[2];
      var dataRef = frameInfo[3];
      var srcData = new Uint8Array(this.buffer, dataRef, size);
      if (unsafe) {
        this.lastFrameRef = frameRef;
        return srcData;
      }
      var data = new Uint8Array(size);
      data.set(srcData);
      this.FFI.djs_free_frame(frameRef);
      return {
        width: width,
        height: height,
        data: data
      };
    }

    /* Public API methods */

    /**
     * Frame decoding, copy of frame data is returned.
     */
  }, {
    key: "decodeFrameAsYUV",
    value: function decodeFrameAsYUV(obu) {
      return this._decodeFrame(obu, DJS_FORMAT_YUV, false);
    }
  }, {
    key: "decodeFrameAsBMP",
    value: function decodeFrameAsBMP(obu) {
      return this._decodeFrame(obu, DJS_FORMAT_BMP, false);
    }

    /**
     * Unsafe decoding with minimal overhead, pointer to WebAssembly
     * memory is returned. User can't call any dav1d.js methods while
     * keeping reference to it and shall call `unsafeCleanup` when
     * finished using the data.
     */
  }, {
    key: "unsafeDecodeFrameAsYUV",
    value: function unsafeDecodeFrameAsYUV(obu) {
      return this._decodeFrame(obu, DJS_FORMAT_YUV, true);
    }
  }, {
    key: "unsafeDecodeFrameAsBMP",
    value: function unsafeDecodeFrameAsBMP(obu) {
      return this._decodeFrame(obu, DJS_FORMAT_BMP, true);
    }
  }, {
    key: "unsafeCleanup",
    value: function unsafeCleanup() {
      if (this.lastFrameRef) {
        this.FFI.djs_free_frame(this.lastFrameRef);
        this.lastFrameRef = null;
      }
    }
  }]);
  return Dav1d;
}();
/* unused harmony default export */ var __WEBPACK_DEFAULT_EXPORT__ = ({
  create: create
});

/***/ }),

/***/ "./src/avif-service.ts":
/*!*****************************!*\
  !*** ./src/avif-service.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "arr2blob": () => (/* binding */ arr2blob),
/* harmony export */   "nativeDecodeAvif": () => (/* binding */ nativeDecodeAvif),
/* harmony export */   "setClientReady": () => (/* binding */ setClientReady),
/* harmony export */   "setClientWaiting": () => (/* binding */ setClientWaiting),
/* harmony export */   "waitForClient": () => (/* binding */ waitForClient)
/* harmony export */ });
/* harmony import */ var _mov__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./mov */ "./src/mov.ts");
/* harmony import */ var _constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./constants */ "./src/constants.ts");



// Wait for client to become ready.
var waitForClient = [];

/**
 * It takes an array of bytes and returns a blob
 * @param bmpArr - the array of bytes that make up the BMP file
 * @returns A blob object.
 */
function arr2blob(bmpArr) {
  return new Blob([bmpArr], {
    type: _constants__WEBPACK_IMPORTED_MODULE_1__.rasterFormat
  });
}

/**
 * It creates a promise that resolves immediately if it already exists, or creates a new promise that
 * resolves immediately if it doesn't exist
 * @param [cid=0] - The client ID of the client that is ready.
 */
function setClientReady() {
  var cid = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  if (waitForClient[cid]) {
    waitForClient[cid].resolve();
  } else {
    waitForClient[cid] = {
      ready: Promise.resolve(),
      resolve: null
    };
  }
}

/**
 * It creates a promise that will be resolved when the client is ready
 * @param cid - The client ID of the client that is waiting.
 */
function setClientWaiting(cid) {
  if (!waitForClient[cid]) {
    var resolve = null;
    var ready = new Promise(function (res) {
      resolve = res;
    });
    waitForClient[cid] = {
      ready: ready,
      resolve: resolve
    };
  }
}

/**
 * It converts an AVIF file to a MOV file, and then sends the MOV file to the main thread
 * @param client - the worker client
 * @param id - The id of the message that was sent from the main thread.
 * @param avifArr - the Uint8Array of the AVIF file
 */
function nativeDecodeAvif(client, id, avifArr) {
  var movArr = (0,_mov__WEBPACK_IMPORTED_MODULE_0__.avif2mov)(avifArr);
  client.postMessage({
    id: id,
    type: 'avif-mov',
    data: movArr
  }, [movArr]);
}

/***/ }),

/***/ "./src/avif-sw.ts":
/*!************************!*\
  !*** ./src/avif-sw.ts ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "resolveTask": () => (/* binding */ resolveTask)
/* harmony export */ });
/* unused harmony exports taskById, taskCounter, rejectTask */
/* harmony import */ var _bmp__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./bmp */ "./src/bmp.ts");
/* harmony import */ var _avif_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./avif-service */ "./src/avif-service.ts");
/* harmony import */ var _decode__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./decode */ "./src/decode.ts");
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }



var CACHE_NAME = 'avifCache';
var CACHE_VERSION = 1;
var CURRENT_CACHES = {
  AvifCache: "".concat(CACHE_NAME, "-V").concat(CACHE_VERSION)
};

// Pending tasks.
var taskById = {};
var taskCounter = 0;

/**
 * It takes a taskId and a callback function, and if the taskId is valid, it calls the callback
 * function with the task's toBlob function as an argument
 * @param taskId - The id of the task.
 * @param cb - a callback function that takes a single parameter, which is a function that returns a
 * Blob.
 */
function resolveTask(taskId, cb) {
  var task = taskById[taskId];
  if (task) {
    task.resolve(cb(task.toBlob));
  }
}

/**
 * It rejects a task by its id
 * @param taskId - The id of the task.
 * @param err - The error message to be passed to the reject function.
 */
function rejectTask(taskId, err) {
  var task = taskById[taskId];
  if (task) {
    task.reject(err);
  }
}

/* A service worker event listener that is called when the service worker is installed. */
self.addEventListener('install', function (event) {
  // The promise that skipWaiting() returns can be safely ignored.
  self.skipWaiting();
});

/**
 * Cleaning up old caches.
 * The activate handler takes care of cleaning up old caches.
 */
self.addEventListener('activate', function (event) {
  var currentCaches = [CURRENT_CACHES];
  event.waitUntil(caches.keys().then(function (cacheNames) {
    return cacheNames.filter(function (cacheName) {
      return !currentCaches.includes(cacheName);
    });
  }).then( /*#__PURE__*/function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(cachesToDelete) {
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return Promise.all(cachesToDelete.map( /*#__PURE__*/function () {
              var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(cacheToDelete) {
                return _regeneratorRuntime().wrap(function _callee$(_context) {
                  while (1) switch (_context.prev = _context.next) {
                    case 0:
                      _context.next = 2;
                      return caches["delete"](cacheToDelete);
                    case 2:
                      return _context.abrupt("return", _context.sent);
                    case 3:
                    case "end":
                      return _context.stop();
                  }
                }, _callee);
              }));
              return function (_x2) {
                return _ref2.apply(this, arguments);
              };
            }()));
          case 2:
            return _context2.abrupt("return", _context2.sent);
          case 3:
          case "end":
            return _context2.stop();
        }
      }, _callee2);
    }));
    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }()).then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return self.clients.claim();
        case 2:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }))));
});

/* Listening for messages from the client. */
self.addEventListener('message', function (event) {
  if (event.data === undefined) return;

  // Handle job messages.
  var msg = event.data;
  switch (msg.type) {
    // Client asks for our update
    case 'avif-update':
      self.skipWaiting();
      break;

    // Client asks to activate us right away
    case 'avif-claim':
      clients.claim();
      break;

    // Client asks to activate us right away
    case 'avif-unload':
      console.log('cleanup received!');
      caches.keys().then( /*#__PURE__*/function () {
        var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(cacheNames) {
          return _regeneratorRuntime().wrap(function _callee5$(_context5) {
            while (1) switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return Promise.all(cacheNames.map( /*#__PURE__*/function () {
                  var _ref5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(cacheName) {
                    return _regeneratorRuntime().wrap(function _callee4$(_context4) {
                      while (1) switch (_context4.prev = _context4.next) {
                        case 0:
                          _context4.next = 2;
                          return caches["delete"](cacheName);
                        case 2:
                          return _context4.abrupt("return", _context4.sent);
                        case 3:
                        case "end":
                          return _context4.stop();
                      }
                    }, _callee4);
                  }));
                  return function (_x4) {
                    return _ref5.apply(this, arguments);
                  };
                }()));
              case 2:
                return _context5.abrupt("return", _context5.sent);
              case 3:
              case "end":
                return _context5.stop();
            }
          }, _callee5);
        }));
        return function (_x3) {
          return _ref4.apply(this, arguments);
        };
      }());
      break;

    // Client is ready
    case 'avif-replace':
      console.log(msg.data);
      (0,_decode__WEBPACK_IMPORTED_MODULE_2__.polyfillAvif)(msg.data).then(function () {
        (0,_avif_service__WEBPACK_IMPORTED_MODULE_1__.setClientReady)(event.source.id);
      });
      break;

    // Client asks to activate us right away
    case 'uninstall':
      console.log('uninstall command received! bye bye!');
      self.sessionStorage.clear();
      break;

    // Client sent task result
    case 'avif-rgba':
      var bmpArr = (0,_bmp__WEBPACK_IMPORTED_MODULE_0__.rgba2bmp)(msg.data, msg.width, msg.height);
      resolveTask(msg.id, function (toBlob) {
        return toBlob ? (0,_avif_service__WEBPACK_IMPORTED_MODULE_1__.arr2blob)(bmpArr) : bmpArr;
      });
      break;

    // Client sent task error
    case 'avif-error':
      rejectTask(msg.id, new Error(msg.data));
      break;

    // Client sent task request
    case 'avif-task':
      var client = event.source;
      var id = msg.id;
      new Promise(function (resolve, reject) {
        taskById[id] = {
          resolve: resolve,
          reject: reject,
          toBlob: false
        };
        console.log(msg.data);
        (0,_decode__WEBPACK_IMPORTED_MODULE_2__.decodeAvif)(client, id, msg.data);
      }).then(function (bmpArr) {
        delete taskById[id];
        client.postMessage({
          id: id,
          type: 'avif-task',
          data: bmpArr
        }, [bmpArr]);
      }, function (err) {
        delete taskById[id];
        client.postMessage({
          id: id,
          type: 'avif-error',
          data: err.message
        });
      });
      break;
    default:
      break;
  }
});

/* A service worker event listener that is called when the service worker is installed. */
self.addEventListener('fetch', function (event) {
  console.log('Handling fetch event for', event.request.url);

  /**
   * if the requested file is an avif
   */
  if (event.request.url.match(/\.avif$/i)) {
    var id = taskCounter++;
    (0,_avif_service__WEBPACK_IMPORTED_MODULE_1__.setClientWaiting)(event.clientId);

    /**
     * search in cache for that file
     */
    event.respondWith(caches.open(CURRENT_CACHES.AvifCache).then( /*#__PURE__*/function () {
      var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee8(cache) {
        return _regeneratorRuntime().wrap(function _callee8$(_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              _context8.next = 2;
              return cache.match(event.request).then(function (cachedResponse) {
                console.log(event.request.url + (cachedResponse != null ? ' cached ' : ' not cached'));

                /**
                * return the file OR fetch network for the requested file
                */
                return cachedResponse != null || new Promise(function (resolve, reject) {
                  taskById[id] = {
                    resolve: resolve,
                    reject: reject,
                    toBlob: true
                  };
                  clients.get(event.clientId).then( /*#__PURE__*/function () {
                    var _ref7 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7(client) {
                      return _regeneratorRuntime().wrap(function _callee7$(_context7) {
                        while (1) switch (_context7.prev = _context7.next) {
                          case 0:
                            _context7.next = 2;
                            return fetch(event.request.clone(), {
                              credentials: 'same-origin'
                            }).then( /*#__PURE__*/function () {
                              var _ref8 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6(res) {
                                return _regeneratorRuntime().wrap(function _callee6$(_context6) {
                                  while (1) switch (_context6.prev = _context6.next) {
                                    case 0:
                                      _context6.next = 2;
                                      return res.arrayBuffer();
                                    case 2:
                                      return _context6.abrupt("return", _context6.sent);
                                    case 3:
                                    case "end":
                                      return _context6.stop();
                                  }
                                }, _callee6);
                              }));
                              return function (_x7) {
                                return _ref8.apply(this, arguments);
                              };
                            }()).then(function (avifArr) {
                              return (0,_decode__WEBPACK_IMPORTED_MODULE_2__.decodeAvif)(client, id, avifArr);
                            });
                          case 2:
                            return _context7.abrupt("return", _context7.sent);
                          case 3:
                          case "end":
                            return _context7.stop();
                        }
                      }, _callee7);
                    }));
                    return function (_x6) {
                      return _ref7.apply(this, arguments);
                    };
                  }())["catch"](reject);
                }).then(function (blob) {
                  delete taskById[id];
                  cache.put(event.request.url + '.cache', new Response(blob)).then(function () {
                    console.log(event.request.url + '.cache stored');
                  });
                  return new Response(blob);
                }, function (err) {
                  delete taskById[id];
                  throw err;
                });
              })["catch"](function (error) {
                console.error('  Error in fetch handler:', error);
                throw error;
              });
            case 2:
              return _context8.abrupt("return", _context8.sent);
            case 3:
            case "end":
              return _context8.stop();
          }
        }, _callee8);
      }));
      return function (_x5) {
        return _ref6.apply(this, arguments);
      };
    }()));
  }
});

/***/ }),

/***/ "./src/bmp.ts":
/*!********************!*\
  !*** ./src/bmp.ts ***!
  \********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "rgba2bmp": () => (/* binding */ rgba2bmp)
/* harmony export */ });
/**
 * Convert raw pixel data to BMP.
 * It takes a Uint8ClampedArray (ab) containing the RGBA values of a canvas, and returns an ArrayBuffer
 * (file) containing a BMP file
 * Based on canvas-to-bmp ((c) 2015 Ken "Epistemex" Fyrstenberg, MIT).
 * @param ab - the ArrayBuffer containing the image data
 * @param w - width of the image
 * @param h - height of the image
 * @returns A file
 */
function rgba2bmp(ab, w, h) {
  function setU16(v) {
    view.setUint16(pos, v, true);
    pos += 2;
  }
  function setU32(v) {
    view.setUint32(pos, v, true);
    pos += 4;
  }
  var headerSize = 54; // 14 + 40 bytes
  var stride = Math.floor((24 * w + 31) / 32) * 4; // row length incl. padding
  var pixelArraySize = stride * h; // total bitmap size
  var fileLength = headerSize + pixelArraySize; // header size is known + bitmap
  var file = new ArrayBuffer(fileLength); // raw byte buffer (returned)
  var view = new DataView(file); // handle endian, reg. width etc.
  var data32 = new Uint32Array(ab); // 32-bit representation of canvas
  var w3 = w * 3;
  var pos32 = 0;
  var pos = 0;
  var y = 0;

  // BMP header.
  setU16(0x4d42); // BM
  setU32(fileLength); // total length
  pos += 4; // skip unused fields
  setU32(headerSize); // offset to pixels

  // DIB header.
  setU32(40); // DIB header size
  setU32(w); // width
  setU32(-h >>> 0); // negative = top-to-bottom
  setU16(1); // 1 plane
  setU16(24); // 24-bit (RGB)
  setU32(0); // no compression (BI_RGB)
  setU32(pixelArraySize); // bitmap size incl. padding (stride x height)
  setU32(2835); // pixels/meter h (~72 DPI x 39.3701 inch/m)
  setU32(2835); // pixels/meter v

  // Bitmap data, change order from ABGR to BGR.
  while (y < h) {
    var shift = headerSize + y * stride;
    var x = 0;
    while (x < w3) {
      var abgr = data32[pos32++];
      var bg = abgr >> 8 & 0xffff;
      var r = abgr & 0xff;
      view.setUint16(shift + x, bg);
      view.setUint8(shift + x + 2, r);
      x += 3;
    }
    y++;
  }
  return file;
}

/***/ }),

/***/ "./src/constants.ts":
/*!**************************!*\
  !*** ./src/constants.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "rasterFormat": () => (/* binding */ rasterFormat)
/* harmony export */ });
/* unused harmony exports AVIF_SERVICE_WORKER_FILE, avifPolyfillOptions */
var AVIF_SERVICE_WORKER_FILE = 'avif-sw.js';
var rasterFormat = 'image/bmp';
var avifPolyfillOptions = {
  onUpdate: function onUpdate() {
    return null;
  },
  swURL: AVIF_SERVICE_WORKER_FILE,
  wasmURL: '/dist/dav1d.wasm',
  forcePolyfill: false,
  scope: '/'
};

/***/ }),

/***/ "./src/decode.ts":
/*!***********************!*\
  !*** ./src/decode.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "decodeAvif": () => (/* binding */ decodeAvif),
/* harmony export */   "polyfillAvif": () => (/* binding */ polyfillAvif)
/* harmony export */ });
/* unused harmony exports decoderContext, decodeMov, polyfillDecodeAvif, getServiceWorkerOpts, getFilename */
/* harmony import */ var _registration__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./registration */ "./src/registration.ts");
/* harmony import */ var _supportDetection__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./supportDetection */ "./src/supportDetection.ts");
/* harmony import */ var _mov__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./mov */ "./src/mov.ts");
/* harmony import */ var _avif_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./avif-service */ "./src/avif-service.ts");
/* harmony import */ var _avif_sw__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./avif-sw */ "./src/avif-sw.ts");
/* harmony import */ var dav1d_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! dav1d.js */ "./node_modules/dav1d.js/dav1d.js");
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }







// AV1 decoder context.
var decoderContext = null;

/**
 * Decode AVIF data using native browser's AV1 decoder.
 * It creates a video element, sets its src to the input, waits for the video to load, then draws the
 * video to a canvas and returns the canvas's image data
 * @param {ArrayBufferView | ArrayBuffer | Blob | string} arr - ArrayBufferView | ArrayBuffer | Blob |
 * string
 * @returns A promise that resolves to an object with a width, height, and data property.
 */
function decodeMov(_x) {
  return _decodeMov.apply(this, arguments);
}

/**
 * It takes an AVIF array, converts it to an OBU array, decodes the OBU array to a BMP array, and
 * returns the BMP array
 * @param client - the client object that was passed to the worker.
 * @param id - The id of the task.
 * @param avifArr - The AVIF data as a Uint8Array.
 */
function _decodeMov() {
  _decodeMov = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(arr) {
    var blob, blobURL;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          blob = new Blob([arr], {
            type: 'video/mp4'
          });
          blobURL = URL.createObjectURL(blob);
          _context.next = 4;
          return new Promise(function (resolve, reject) {
            var vid = document.createElement('video');
            vid.addEventListener(_registration__WEBPACK_IMPORTED_MODULE_0__.isEdge ? 'ended' : 'loadeddata', function () {
              if ((vid.mozDecodedFrames == null || vid.mozDecodedFrames > 0) && (vid.webkitDecodedFrameCount == null || vid.webkitDecodedFrameCount > 0)) {
                resolve(vid);
              } else {
                reject(new Error('partial AV1 frame'));
              }
            });
            vid.addEventListener('error', function () {
              reject(new Error('cannot decode AV1 frame'));
            });
            vid.muted = true;
            vid.src = blobURL;
            vid.play();
          }).then(function (vid) {
            /**
             * maybe a separate function since is widely used
             */

            var c = document.createElement('canvas');
            var ctx = c.getContext('2d');
            c.width = vid.videoWidth;
            c.height = vid.videoHeight;
            ctx.drawImage(vid, 0, 0, c.width, c.height);
            var imgData = ctx.getImageData(0, 0, c.width, c.height);
            return {
              width: c.width,
              height: c.height,
              data: imgData.data.buffer
            };
          }).then(function (res) {
            URL.revokeObjectURL(blobURL);
            return res;
          }, function (err) {
            URL.revokeObjectURL(blobURL);
            throw err;
          });
        case 4:
          return _context.abrupt("return", _context.sent);
        case 5:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _decodeMov.apply(this, arguments);
}
function polyfillDecodeAvif(client, id, avifArr) {
  var obuArr = (0,_mov__WEBPACK_IMPORTED_MODULE_2__.avif2obu)(avifArr).data;
  (0,_avif_sw__WEBPACK_IMPORTED_MODULE_4__.resolveTask)(id, function (toBlob) {
    if (toBlob) {
      // console.time("dav1d "+id);
      var bmpArr = decoderContext.unsafeDecodeFrameAsBMP(obuArr);
      // console.timeEnd("dav1d "+id);
      var blob = (0,_avif_service__WEBPACK_IMPORTED_MODULE_3__.arr2blob)(bmpArr);
      decoderContext.unsafeCleanup();
      return blob;
    } else {
      // Will be transfered so ok to copy.
      return decoderContext.decodeFrameAsBMP(obuArr);
    }
  });
}

/**
 * It creates a new decoder context, and then sets the client ready flag
 * @param opts - {
 * @returns A promise that resolves to the decoderContext.
 */
function polyfillAvif(opts) {
  return (0,dav1d_js__WEBPACK_IMPORTED_MODULE_5__.create)({
    wasmURL: opts.wasmURL
  }).then(function (decoder) {
    decoderContext = decoder;
  });
}

/**
 * If the browser supports the AVIF decoder, use it, otherwise use the polyfill
 * @param client - The client object that was passed to the worker.
 * @param id - The id of the image to decode.
 * @param avifArr - The Uint8Array of the AVIF file.
 * @returns A promise that resolves to an image object.
 */
function decodeAvif(client, id, avifArr) {
  console.log(_avif_service__WEBPACK_IMPORTED_MODULE_3__.waitForClient[client.id]);
  return _avif_service__WEBPACK_IMPORTED_MODULE_3__.waitForClient[client.id].ready.then(function () {
    decoderContext ? polyfillDecodeAvif(client, id, avifArr) : (0,_avif_service__WEBPACK_IMPORTED_MODULE_3__.nativeDecodeAvif)(client, id, avifArr);
  });
}

/**
 * If the user's browser doesn't support AV1, we'll use the polyfill. Otherwise, we'll use the native
 * decoder
 * @param  - `forcePolyfill` - if true, the polyfill will be used even if the browser supports AV1.
 */
function getServiceWorkerOpts(_ref) {
  var forcePolyfill = _ref.forcePolyfill,
    wasmURL = _ref.wasmURL;
  var usePolyfill = forcePolyfill || !(0,_supportDetection__WEBPACK_IMPORTED_MODULE_1__.hasAv1Support)();
  return {
    usePolyfill: usePolyfill,
    wasmURL: wasmURL
  };
}

/**
 * It takes a string, splits it on the forward slash character, and returns the last item in the
 * resulting array
 * @param uri - The URI of the file to be downloaded.
 * @returns The last item in the array.
 */
function getFilename(uri) {
  return uri.split('/').pop();
}

/**
 * It takes a Blob and returns a new Blob with the same image data but a different file format
 * @param imageBlob - The Blob object you want to convert
 * @param mime - The MIME type of the new Blob.
 * @returns A new Blob object
 */
function blobToBlob(imageBlob, mime) {
  var canvas = self.createElement('canvas');
  var context = canvas.getContext('2d');
  var newBlob;

  // Create a new Image object and set its source to the Blob URL
  var img = new Image();
  img.src = URL.createObjectURL(imageBlob);

  // When the image has loaded, draw it onto the canvas with the desired file format
  img.onload = function () {
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0);

    // Convert the canvas to a new Blob with the desired file format
    canvas.toBlob(function (nb) {
      newBlob = nb;
    }, mime);
  };
  return newBlob;
}

/***/ }),

/***/ "./src/mov.ts":
/*!********************!*\
  !*** ./src/mov.ts ***!
  \********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "avif2mov": () => (/* binding */ avif2mov),
/* harmony export */   "avif2obu": () => (/* binding */ avif2obu)
/* harmony export */ });
/* unused harmony export obu2mov */
// ISOBMFF constants.
var BOX_HEADER_SIZE = 8;
var BOX_FTYP = 0x66747970;
var BOX_META = 0x6d657461;
var BOX_ILOC = 0x696c6f63;
var BOX_IPRP = 0x69707270;
var BOX_IPCO = 0x6970636f;
var BOX_ISPE = 0x69737065;

// MOV container stub with single video track.
var MOV_HEADER = function () {
  var u32 = new Uint32Array([469762048, 1887007846, 1836020585, 131072, 1836020585, 846164841, 825520237, 1140981760, 1987014509, 1811939328, 1684567661, 0, 0, 0, 3892510720, 704643072, 256, 1, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 64, 0, 0, 0, 0, 0, 0, 33554432, 3489726464, 1801548404, 1543503872, 1684564852, 50331648, 0, 0, 16777216, 0, 704643072, 0, 0, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 64, 32775, 14340, 1812004864, 1634296941, 536870912, 1684563053, 0, 0, 0, 3227320320, 3909287936, 50261, 553648128, 1919706216, 0, 0, 1701079414, 0, 0, 0, 16777216, 1852402979, 102, 1752004116, 100, 1, 0, 0, 1852400676, 102, 1701995548, 102, 0, 1, 1819440396, 32, 1, 1651799011, 108, 1937011583, 100, 0, 1, 813064559, 49, 0, 1, 0, 0, 0, 75499264, 4718648, 4718592, 0, 65536, 0, 0, 0, 0, 0, 0, 0, 0, 16776984, 1629028352, 2168664438, 167775240, 11, 3284118338, 31915895, 402653184, 1937011827, 0, 16777216, 16777216, 3909287936, 469762048, 1668510835, 0, 16777216, 16777216, 16777216, 16777216, 335544320, 2054386803, 0, 0, 16777216, 335544320, 1868788851, 0, 16777216, 1744961536, 0, 1952539757]);
  return new Uint8Array(u32.buffer);
}();
var MOV_HEADER_SIZE = MOV_HEADER.byteLength;
var MOV_STSZ_OFFSET = 568;
var MOV_MDAT_OFFSET = 608;
var MOV_TKHD_WIDTH_OFFSET = 234;
var MOV_AV01_WIDTH_OFFSET = 437;

/**
 * It throws an error if the first argument is false
 * @param cond - The condition to check.
 * @param str - The string to be parsed.
 */
function assert(cond, str) {
  if (!cond) throw new Error(str);
}
function findMoovOffset(dataView) {
  var length = dataView.byteLength;
  var offset = 0;
  while (offset < length) {
    var size = dataView.getUint32(offset, false);
    var type = dataView.getInt32(offset + 4, false);
    if (type === 0x6D6F6F76) {
      // found the moov atom
      return offset;
    }

    // move to the next atom
    offset += size;
  }

  // moov atom not found
  return null;
}
function findAtomOffset(dataView, parentOffset, atomType) {
  var parentSize = dataView.getUint32(parentOffset, false);
  var offset = parentOffset + 8;
  while (offset < parentOffset + parentSize) {
    var size = dataView.getUint32(offset, false);
    var type = dataView.getInt32(offset + 4, false);
    if (type === atomType) {
      // found the atom
      return offset;
    }
    offset += size;
  }
}
function getMovHeaderData(source) {
  // Create a new DataView object from your source data
  var dataView = new DataView(source);

  // Find the offset of the moov atom
  var moovOffset = findMoovOffset(dataView);

  // Find the offset of the mvhd atom
  var mvhdOffset = findAtomOffset(dataView, moovOffset, 'mvhd');

  // Find the offset of the trak atom
  var trakOffset = findAtomOffset(dataView, moovOffset, 'trak');

  // Find the offset of the tkhd atom
  var tkhdOffset = findAtomOffset(dataView, trakOffset, 'tkhd');

  // Find the offset of the mdia atom
  var mdiaOffset = findAtomOffset(dataView, trakOffset, 'mdia');

  // Find the offset of the mdhd atom
  var mdhdOffset = findAtomOffset(dataView, mdiaOffset, 'mdhd');

  // Find the offset of the stbl atom
  var stblOffset = findAtomOffset(dataView, mdiaOffset, 'stbl');

  // Find the offset of the stsz atom
  var stszOffset = findAtomOffset(dataView, stblOffset, 'stsz');

  // Get the timescale and duration from the mvhd atom
  var timescale = dataView.getUint32(mvhdOffset + 12, false);
  var duration = dataView.getUint32(mvhdOffset + 16, false);

  // Get the width and height from the tkhd atom
  var width = dataView.getUint16(tkhdOffset + 76, false);
  var height = dataView.getUint16(tkhdOffset + 78, false);

  // Get the number of frames from the mdhd atom
  var frameCount = dataView.getUint32(mdhdOffset + 16, false) / timescale;

  // Get the bit depth from the stsz atom
  var bitDepth = dataView.getUint16(stszOffset + 24, false);
}

/**
 * It parses the AVIF file
 * header, extracts the image dimensions and the actual image data, and returns
 * them as an object
 * @param ab - The ArrayBuffer of the AVIF file.
 * @returns An object with the width, height, and data of the image.
 */
function avif2obu(ab) {
  function getU8() {
    var v = view.getUint8(pos);
    pos += 1;
    return v;
  }
  function getU16() {
    var v = view.getUint16(pos);
    pos += 2;
    return v;
  }
  function getU32() {
    var v = view.getUint32(pos);
    pos += 4;
    return v;
  }
  var view = new DataView(ab);
  var len = ab.byteLength;
  var pos = 0;
  var brandsCheck = false;
  var width = 0;
  var height = 0;
  var data = null;
  while (pos < len) {
    var size = getU32();
    var type = getU32();
    var end = pos + size - BOX_HEADER_SIZE;
    assert(size >= BOX_HEADER_SIZE, 'corrupted file');

    // TODO(Kagami): Add box version checks!
    switch (type) {
      case BOX_FTYP:
        // FIXME(Kagami): Check brands.
        // TODO(Kagami): Also check that meta/hdlr.handler = "pict".
        brandsCheck = true;
        break;
      case BOX_META:
        pos += 1; // version
        pos += 3; // flags
        continue;
      case BOX_IPRP:
        continue;
      case BOX_IPCO:
        continue;
      case BOX_ISPE:
        pos += 1; // version
        pos += 3; // flags
        width = getU32();
        height = getU32();
        break;
      case BOX_ILOC:
        pos += 1; // version
        pos += 3; // flags
        var offsetSizeAndLengthSize = getU8();
        var offsetSize = offsetSizeAndLengthSize >>> 4;
        assert(offsetSize < 8, 'unsupported offset size');
        var lengthSize = offsetSizeAndLengthSize & 0xf;
        assert(lengthSize < 8, 'unsupported length size');
        var baseOffsetSize = getU8() >>> 4;
        assert(baseOffsetSize < 8, 'unsupported base offset size');
        var itemCount = getU16();
        assert(itemCount >= 1, 'bad iloc items number');
        // XXX(Kagami): Choosing first item for simplicity.
        // TODO(Kagami): Use primary item (meta/pitm/item_ID).
        // TODO(Kagami): Also check that meta/iinf/infe[i].item_type = "av01".
        pos += 2; // item_ID
        pos += 2; // data_reference_index
        var baseOffset = baseOffsetSize === 4 ? getU32() : 0;
        pos += 2; // extent_count (>= 1)
        // XXX(Kagami): What should we do if extent_count > 1?
        var extentOffset = offsetSize === 4 ? getU32() : 0;
        var extentLength = lengthSize === 4 ? getU32() : 0;
        var u8 = new Uint8Array(ab);
        var offset = baseOffset + extentOffset;
        data = u8.subarray(offset, offset + extentLength);
        break;
    }
    pos = end;
  }
  assert(brandsCheck, 'bad brands');
  assert(width && height, 'bad image width or height');
  assert(data, 'picture data not found');
  return {
    width: width,
    height: height,
    data: data
  };
}

/**
 * It takes a WebM file and converts it to a MOV file
 * Embed OBU into MOV container stub as video frame.
 * TODO(Kagami): Fix matrix, bitdepth, av1C metadata.
 * @param  - `width` - the width of the video
 * @returns An ArrayBuffer
 */
function obu2mov(_ref) {
  var width = _ref.width,
    height = _ref.height,
    data = _ref.data;
  var fileSize = MOV_HEADER_SIZE + data.byteLength;
  var ab = new ArrayBuffer(fileSize);
  var view = new DataView(ab);
  var u8 = new Uint8Array(ab);
  u8.set(MOV_HEADER);
  u8.set(data, MOV_HEADER_SIZE);
  // |....|stsz|.|...|xxxx|
  view.setUint32(MOV_STSZ_OFFSET + BOX_HEADER_SIZE + 4, data.byteLength);
  // |xxxx|mdat|
  view.setUint32(MOV_MDAT_OFFSET, data.byteLength + BOX_HEADER_SIZE);
  // |xxxx|xxxx|
  view.setUint32(MOV_TKHD_WIDTH_OFFSET, width);
  view.setUint32(MOV_TKHD_WIDTH_OFFSET + 4, height);
  // |xx|xx|
  view.setUint16(MOV_AV01_WIDTH_OFFSET, width);
  view.setUint16(MOV_AV01_WIDTH_OFFSET + 2, height);
  return ab;
}

/**
 * Remux AVIF picture as MOV video with single frame.
 * @param ab - ArrayBuffer of the AVIF file
 * @returns A function that takes an array buffer
 */
function avif2mov(ab) {
  return obu2mov(avif2obu(ab));
}

/***/ }),

/***/ "./src/registration.ts":
/*!*****************************!*\
  !*** ./src/registration.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isEdge": () => (/* binding */ isEdge)
/* harmony export */ });
/* unused harmony export registerSW */
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
var isEdge = navigator.userAgent.includes('Edge');

/**
 * Registers the service worker.
 *
 * @param url
 * @return ServiceWorkerRegistration
 */
function registerSW(_x) {
  return _registerSW.apply(this, arguments);
}
function _registerSW() {
  _registerSW = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(url) {
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if ('serviceWorker' in navigator) {
            // Register a service worker hosted at the root of the
            // site using the default scope.
            navigator.serviceWorker.register(url).then(function (registration) {
              console.log('Service worker registration succeeded:', registration);
              return registration;
            })["catch"](function (error) {
              console.error("Service worker registration failed: ".concat(error));
            });
          } else {
            console.log('Service workers are not supported.');
          }
        case 1:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _registerSW.apply(this, arguments);
}

/***/ }),

/***/ "./src/supportDetection.ts":
/*!*********************************!*\
  !*** ./src/supportDetection.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "hasAv1Support": () => (/* binding */ hasAv1Support)
/* harmony export */ });
/* unused harmony export detectAvifSupport */
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
/**
 * It creates an image element, sets its source to a base64 encoded AVIF image, and then returns true
 * if the image loads successfully
 * https://stackoverflow.com/questions/5573096/detecting-webp-support
 *
 * @returns A boolean value.
 */
function detectAvifSupport() {
  return _detectAvifSupport.apply(this, arguments);
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
function _detectAvifSupport() {
  _detectAvifSupport = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
    var testImageSources, testImage, results;
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          testImageSources = ['data:image/avif;base64,AAAAHGZ0eXBtaWYxAAAAAG1pZjFhdmlmbWlhZgAAAPFtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAHmlsb2MAAAAABEAAAQABAAAAAAEVAAEAAAAfAAAAKGlpbmYAAAAAAAEAAAAaaW5mZQIAAAAAAQAAYXYwMUltYWdlAAAAAHBpcHJwAAAAUWlwY28AAAAUaXNwZQAAAAAAAAABAAAAAQAAABBwYXNwAAAAAQAAAAEAAAAVYXYxQ4EgAAAKBzgABpAQ0AIAAAAQcGl4aQAAAAADCAgIAAAAF2lwbWEAAAAAAAAAAQABBAECg4QAAAAnbWRhdAoHOAAGkBDQAjIUFkAAAEgAAAwGbmVx8APS84zVsoA='];
          testImage = /*#__PURE__*/function () {
            var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(src) {
              return _regeneratorRuntime().wrap(function _callee$(_context) {
                while (1) switch (_context.prev = _context.next) {
                  case 0:
                    _context.next = 2;
                    return new Promise(function (resolve) {
                      var img = document.createElement('img');
                      img.onerror = function () {
                        resolve(false);
                      };
                      img.onload = function () {
                        resolve(true);
                      };
                      img.src = src;
                    });
                  case 2:
                    return _context.abrupt("return", _context.sent);
                  case 3:
                  case "end":
                    return _context.stop();
                }
              }, _callee);
            }));
            return function testImage(_x) {
              return _ref.apply(this, arguments);
            };
          }();
          _context2.next = 4;
          return Promise.all(testImageSources.map(testImage));
        case 4:
          results = _context2.sent;
          return _context2.abrupt("return", results.every(function (result) {
            return !!result;
          }));
        case 6:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _detectAvifSupport.apply(this, arguments);
}
function hasAv1Support() {
  var vid = document.createElement('video');
  return vid.canPlayType('video/mp4; codecs="av01.0.05M.08"') === 'probably';
}

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/avif-sw.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=avif-sw.js.map