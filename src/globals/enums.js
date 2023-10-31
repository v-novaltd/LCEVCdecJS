/* Copyright (c) V-Nova International Limited 2021. All rights reserved. */

/**
 * Events enum.
 *
 * @readonly
 * @enum {string}
 * @exports
 */
const Events = {
  PERFORMANCE_DROPPED: 'performance-dropped',
  PERFORMANCE_RESTORED: 'performance-restored'
};

/**
 * LOQ level enum.
 *
 * @readonly
 * @enum {number}
 * @public
 */
const LoqIndex = {
  PSS_LOQ_0: 0,
  PSS_LOQ_1: 1,
  PSS_LOQ_2: 2
};

/**
 * Result status codes.
 *
 * @readonly
 * @enum {Result}
 * @public
 */
const Result = {
  OK: 0,
  ERROR: 1
};

/**
 * Lcevc status codes.
 *
 * @readonly
 * @enum {Result}
 * @public
 */
const LcevcStatus = {
  APPLIED: 0,
  NOT_APPLIED: 1,
  ERROR: 2
};

/**
 * Shader path type.
 *
 * @readonly
 * @enum {ShaderPaths}
 * @public
 */
const ShaderPaths = {
  SIMPLE: 0,
  FULL: 1,
  DEBUG: 2
};

/**
 * Shader path type.
 *
 * @readonly
 * @enum {ExtensionType}
 * @public
 */
const ExtensionType = {
  MP4: 0,
  WEBM: 1
};

/**
 * Possible operating systems.
 *
 * @readonly
 * @enum {string}
 * @public
 */
const OperatingSystem = {
  MACOS: 'Mac OS',
  IOS: 'iOS',
  WINDOWS: 'Windows',
  ANDROID: 'Android',
  LINUX: 'Linux'
};

/**
 * Possible players.
 *
 * @readonly
 * @enum {string}
 * @public
 */
const Player = {
  SHAKA: 'shaka',
  HLS_JS: 'hls.js',
  DASH_JS: 'dash.js',
  THEO: 'theo'
};

/**
 * Possible types of browsers.
 *
 * @readonly
 * @enum {string}
 * @public
 */
const Browser = {
  EDGE: 'Edge',
  IE11: 'IE11',
  CHROME: 'Chrome',
  FIREFOX: 'Firefox',
  SAFARI: 'Safari',
  OPERA: 'Opera'
};

/**
 * Media container type.
 *
 * @readonly
 * @enum {number}
 * @public
 */
const MediaContainer = {
  TS: 0,
  WEBM: 1,
  MP4: 2
};

/**
 * Streaming Format.
 *
 * @readonly
 * @enum {number}
 * @public
 */
const StreamingFormat = {
  HLS: 0,
  DASH: 1,
  OTHER: -1
};

/**
 * Codec type.
 *
 * @readonly
 * @enum {number}
 * @public
 */
const Codec = {
  H264: 0,
  H265: 1,
  H266: 2
};

/**
 * Dynamic Performance Scaling (DPS) mode
 *
 * @readonly
 * @enum {number}
 * @public
 */
const DPSMode = {
  OFF: 0,
  ACTIVE: 1,
  BASE_ONLY: 2
};

export {
  Events, LoqIndex, Result, LcevcStatus, ShaderPaths, ExtensionType, OperatingSystem, Player,
  Browser, MediaContainer, StreamingFormat, Codec, DPSMode
};
