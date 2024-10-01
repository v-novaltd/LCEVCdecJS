/**
 * Copyright (c) V-Nova International Limited 2014 - 2024
 * All rights reserved.
 *
 * This software is licensed under the BSD-3-Clause-Clear License. No patent licenses
 * are granted under this license. For enquiries about patent licenses, please contact
 * legal@v-nova.com. The LCEVCdecJS software is a stand-alone project and is NOT A
 * CONTRIBUTION to any other project.
 *
 * If the software is incorporated into another project, THE TERMS OF THE
 * BSD-3-CLAUSE-CLEAR LICENSE AND THE ADDITIONAL LICENSING INFORMATION CONTAINED IN
 * THIS FILE MUST BE MAINTAINED, AND THE SOFTWARE DOES NOT AND MUST NOT ADOPT THE
 * LICENSE OF THE INCORPORATING PROJECT. However, the software may be incorporated
 * into a project under a compatible license provided the requirements of the
 * BSD-3-Clause-Clear license are respected, and V-Nova International Limited remains
 * licensor of the software ONLY UNDER the BSD-3-Clause-Clear license (not the
 * compatible license).
 *
 * ANY ONWARD DISTRIBUTION, WHETHER STAND-ALONE OR AS PART OF ANY OTHER PROJECT,
 * REMAINS SUBJECT TO THE EXCLUSION OF PATENT LICENSES PROVISION OF THE
 * BSD-3-CLAUSE-CLEAR LICENSE.
 */

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
