/* Copyright (c) V-Nova International Limited 2021. All rights reserved. */

import { Result } from './globals/enums';

const LCEVC_DPI_HELPERS_VERSION = '3.0.1';

/**
 * Helper function for allocating heap data pointer at the V-Nova LCEVC DPI.
 *
 * @param {!object} module Emscripten module.
 * @param {!Uint8Array} data
 * @returns {Uint8Array}
 * @public
 */
function _createHeapData(module, data) {
  const nDataBytes = data.length * data.BYTES_PER_ELEMENT;
  const dataPtr = module._malloc(nDataBytes); // eslint-disable-line
  module.HEAP32.set(data, dataPtr >> 2);
  return dataPtr;
}

/**
 * Helper function for allocating 8 bytes a data pointer with V-Nova LCEVC DPI.
 *
 * @param {!object} module Emscripten module.
 * @param {!Uint8Array} data
 * @returns {Uint8Array}
 * @public
 */
function _createDataPointer(module, data) {
  const nDataBytes = data.length * data.BYTES_PER_ELEMENT;
  const dataPtr = module._malloc(nDataBytes); // eslint-disable-line
  module.HEAPU8.set(data, dataPtr >> 2);
  const dataHeap = new Uint8Array(module.HEAPU8.buffer, dataPtr, nDataBytes);
  dataHeap.set(new Uint8Array(data.buffer));
  return dataHeap;
}

/**
 * Helper function for allocating 32 bytes data pointer with V-Nova LCEVC DPI.
 *
 * @param {!object} module Emscripten module.
 * @param {!Uint32Array} data
 * @returns {Uint32Array}
 * @public
 */
function _createDataPointer32(module, data) {
  const nDataBytes = data.length;
  const dataPtr = module._malloc(nDataBytes); // eslint-disable-line
  module.HEAPU32.set(data, dataPtr >> 2);
  const dataHeap = new Uint32Array(module.HEAPU32.buffer, dataPtr, nDataBytes);
  dataHeap.set(new Uint32Array(data.buffer));
  return dataHeap;
}

/**
 * Helper function for free a heap data at the V-Nova LCEVC DPI.
 *
 * @param {!object} module Emscripten module.
 * @param {!Uint8Array|Uint32Array} data
 * @returns {Result}
 * @public
 */
function _freeHeapData(module, data) {
  if (data && data !== null) {
    module._free(data); // eslint-disable-line
  }

  return Result.OK;
}

/**
 * Helper function for free a data pointer with V-Nova LCEVC DPI.
 *
 * @param {!object} module Emscripten module.
 * @param {!Uint8Array|Uint32Array} data
 * @returns {Result}
 * @public
 */
function _freeDataPointer(module, data) {
  if (data && data !== null) {
    module._free(data.byteOffset); // eslint-disable-line
  }

  return Result.OK;
}

export {
  LCEVC_DPI_HELPERS_VERSION,
  _createHeapData,
  _createDataPointer,
  _createDataPointer32,
  _freeHeapData,
  _freeDataPointer
};
