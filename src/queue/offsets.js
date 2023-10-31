/* Copyright (c) V-Nova International Limited 2021. All rights reserved. */

import {
  OperatingSystem, Player, Browser, MediaContainer
} from '../globals/enums';
import EnvironmentUtils from '../utils/environment_utils';

/**
 * Offsets is the browserSpecific , playerSpecific and containerSpecific offsets.
 *
 * @class Offsets
 */
class Offsets {
    /** @type {object} */
    #residualOffsets = null;

    /** @type {string} */
    #browser = '';

    /** @type {string} */
    #player = '';

    /** @type {string} */
    #os = '';

    constructor(browser, player) {
      /** @type {object} */
      this.#residualOffsets = {
        bypass: true,
        seek: 0,
        play: 0,
        pause: 0,
        fpsReceived: false
      };
      /** @type {string} */
      this.#browser = browser;

      /** @type {string} */
      this.#player = player;
      this.#OS();
    }

    /**
     * Return Frame Offsets for residual Sync
     *
     * @param {number} containerFormat
     * @param {boolean} isLive
     * @param {number} fps
     * @returns {object} residualOffsets
     * @readonly
     * @memberof Offsets
     */
    getOffsets(containerFormat, isLive, fps) {
      let play = 0;
      let seek = 0;
      let bypass = true;
      const frameDuration = 1.0 / fps;
      if (this.#browser === Browser.CHROME) {
        bypass = false;

        if (this.#player === Player.HLS_JS) {
          if (containerFormat === MediaContainer.TS) {
            play = 0;
            seek = 0;
          }
          if (containerFormat === MediaContainer.MP4) {
            play = 0;
            seek = 0;
          }
        }
        if (this.#player === Player.SHAKA) {
          play = 0.00001;
          seek = 0.0;
          if (containerFormat === MediaContainer.TS) {
            if (isLive) {
              play = 0.00001 + (2 * frameDuration);
              seek = 0.0;
            }
            if (!isLive) {
              if (fps > 30) {
                play = 0.00001 - (3 * frameDuration);
                seek = 0.00001 - (3 * frameDuration);
              } else {
                play = -0.01;
                seek = 0.0 - (0.5 * frameDuration);
              }
            }
          }
        }
        if (this.#player === Player.THEO) {
          if (containerFormat === MediaContainer.TS) {
            play = fps > 30 ? -0.03 : -0.05;
            seek = fps > 30 ? -0.03 : -0.05;
          }
          if (containerFormat === MediaContainer.MP4) {
            play = 0.01;
            seek = 0.01;
          }
        }
        if (this.#player === Player.DASH_JS) {
          play = 0.01;
          seek = 0.01;
        }
      }

      if (this.#browser === Browser.FIREFOX) {
        bypass = false;

        if (this.#player === Player.SHAKA) {
          if (containerFormat === MediaContainer.TS) {
            // For TS content Shaka should provide us with the exact offset in appendBuffer calls
            play = 0;
            seek = 0;
          }
          if (containerFormat === MediaContainer.MP4) {
            play = 1 * frameDuration;
            seek = 1 * frameDuration;
          }
        }
        if (this.#player === Player.HLS_JS) {
          play = fps > 30 ? 0.02 : 0.03;
          seek = -0.01;

          // On MacOS, above 30 fps a larger play offset is needed for correct residual sync
          if (this.#os === OperatingSystem.MACOS && fps > 30) {
            play = 0.022;
          }
        }
        if (this.#player === Player.DASH_JS) {
          play = fps > 30 ? 0.03 : 0.04;
          seek = 0;
        }
        if (this.#player === Player.THEO) {
          if (containerFormat === MediaContainer.TS) {
            play = fps > 30 ? -0.02 : -0.04;
            seek = fps > 30 ? -0.04 : -0.06;
          }
          if (containerFormat === MediaContainer.MP4) {
            play = 0.02;
            seek = 0.02;
          }
        }
      }

      if (this.#browser === Browser.SAFARI) {
        bypass = false;

        if (this.#player === Player.HLS_JS) {
          if (containerFormat === MediaContainer.TS) {
            play = -0.01;
            seek = -0.01;
          }
          if (containerFormat === MediaContainer.MP4) {
            play = -0.01;
            seek = -0.01;
          }
        }
        if (this.#player === Player.SHAKA) {
          play = 0.00001;
          seek = 0.0;
          if (containerFormat === MediaContainer.TS && isLive) {
            play = 0.00001 + (2 * frameDuration);
            seek = 0.0;
          }
        }
        if (this.#player === Player.THEO) {
          if (containerFormat === MediaContainer.TS) {
            play = -0.02;
            seek = -0.02;
          }
          if (containerFormat === MediaContainer.MP4) {
            play = -0.01;
            seek = -0.01;
          }
        }
      }

      this.#residualOffsets.bypass = bypass;
      this.#residualOffsets.seek = seek;
      this.#residualOffsets.play = play;
      this.#residualOffsets.fpsReceived = Number.isFinite(fps);

      return this.#residualOffsets;
    }

    /**
     * Detects and Sets Current OS
     *
     * @private
     * @memberof Offsets
     */
    #OS() {
      this.#os = EnvironmentUtils.detectOperatingSystem();
    }
}

export default Offsets;
