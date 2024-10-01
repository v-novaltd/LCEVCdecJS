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

type PlayerControlConfig = {
  controlsID: string,
  enabled: boolean,
  playButton: boolean,
  seekButton: boolean,
  volumeButton: boolean,
  fullscreenButton: boolean,
  fullscreenButtonPos: string,
  toggleButton: boolean,
  toggleButtonPos: string,
  position: string,
  offsetY: number,
  offsetX: number,
  colorPlayed: number,
  colorBuffered: number,
  colorUnplayed: number,
  fullscreenElement: HTMLElement | null
};

type LCEVCdecConfig = {
  debugStats: boolean,
  renderAtDisplaySize: boolean,
  shaderPath: number,
  logLevel: number,
  dps: boolean,
  dynamicPerformanceScaling: boolean,
  iOSFallback: boolean,
  logo: boolean,
  drawLogo: boolean,
  loop: boolean,
  poster: boolean,
  ebmlVersion: string,
  mp4boxVersion: string,
  ebmlLoadOnStartup: boolean,
  mp4boxLoadOnStartup: boolean,

  // Player controls
  playerControls: PlayerControlConfig;
};

const LCEVCdecDefaultConfig: LCEVCdecConfig = {
  debugStats: false,
  renderAtDisplaySize: true,
  shaderPath: 1,
  logLevel: 0,
  dps: true,
  dynamicPerformanceScaling: true,
  iOSFallback: false,
  logo: true,
  drawLogo: true,
  loop: false,
  poster: true,
  ebmlVersion: '3.0.0',
  mp4boxVersion: '0.5.2',
  ebmlLoadOnStartup: false,
  mp4boxLoadOnStartup: true,

  playerControls: {
    controlsID: 'player-controls',
    enabled: false,
    playButton: true,
    seekButton: false,
    volumeButton: false,
    fullscreenButton: true,
    fullscreenButtonPos: 'left',
    toggleButton: false,
    toggleButtonPos: 'right',
    position: 'bottom',
    offsetY: 24,
    offsetX: 0,
    colorPlayed: 0x5e7ebd,
    colorBuffered: 0xadadad,
    colorUnplayed: 0x5e5e5e,
    fullscreenElement: null
  }
};

/**
 * Merge the default and the user configuration.
 *
 * @param {LCEVCdecConfig} config User configuration.
 * @returns {LCEVCdecConfig} Merged configuration.
 */
function mergeConfigurations(config) {
  const mergedConfig = { ...LCEVCdecDefaultConfig, ...config };
  if (typeof config.dynamicPerformanceScaling !== 'undefined') {
    mergedConfig.dps = config.dynamicPerformanceScaling;
  }
  if (typeof config.drawLogo !== 'undefined') {
    mergedConfig.logo = config.drawLogo;
  }
  mergedConfig.playerControls = {
    ...LCEVCdecDefaultConfig.playerControls, ...config.playerControls
  };

  return mergedConfig;
}

export {
  PlayerControlConfig, LCEVCdecConfig, LCEVCdecDefaultConfig, mergeConfigurations
};
