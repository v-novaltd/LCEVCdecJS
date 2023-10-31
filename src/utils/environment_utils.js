/* Copyright (c) V-Nova International Limited 2021. All rights reserved. */

import {
  OperatingSystem, Player, Browser
} from '../globals/enums';

/**
 * The EnvironmentUtils class contains detection functionality
 * for operating system, player and browser detection.
 *
 * @class EnvironmentUtils
 */
class EnvironmentUtils {
  /**
   * Detects the operating system
   *
   * @static
   * @returns {string} The detected operating system
   */
  static detectOperatingSystem() {
    const { userAgent, platform } = window.navigator;
    const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
    const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
    const iosPlatforms = ['iPhone', 'iPad', 'iPod'];

    let os;
    if (macosPlatforms.indexOf(platform) !== -1) {
      os = OperatingSystem.MACOS;
    } else if (iosPlatforms.indexOf(platform) !== -1) {
      os = OperatingSystem.IOS;
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
      os = OperatingSystem.WINDOWS;
    } else if (/Android/.test(userAgent)) {
      os = OperatingSystem.ANDROID;
    } else if (!os && /Linux/.test(platform)) {
      os = OperatingSystem.LINUX;
    }
    return os;
  }

  /**
   * Detects the player
   *
   * @returns {string} The detected player
   */
  static detectPlayer() {
    let player;
    if (typeof window.Hls !== 'undefined') {
      player = Player.HLS_JS;
    } else if (typeof window.dashjs !== 'undefined') {
      player = Player.DASH_JS;
    } else if (typeof window.shaka !== 'undefined') {
      player = Player.SHAKA;
    } else if (typeof window.THEOplayer !== 'undefined') {
      player = Player.THEO;
    }
    return player;
  }

  /**
   * Detects the broswer
   *
   * @returns {string} The detected browser
   */
  static detectBrowser() {
    let browser;
    if (navigator.userAgent.search('Edge') > -1) {
      browser = Browser.EDGE;
    } else if (navigator.userAgent.search('Trident/7.0') > -1) {
      browser = Browser.IE11;
    } else if (navigator.userAgent.search('Chrome') > -1) {
      browser = Browser.CHROME;
    } else if (navigator.userAgent.search('Firefox') > -1) {
      browser = Browser.FIREFOX;
    } else if (navigator.userAgent.search('Safari') > -1) {
      browser = Browser.SAFARI;
    } else if (navigator.userAgent.search('Opera') > -1) {
      browser = Browser.OPERA;
    }
    return browser;
  }
}

export default EnvironmentUtils;
