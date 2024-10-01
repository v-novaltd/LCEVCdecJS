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
 * Visibility controller handles when the player is at background.
 *
 * When the player is at background and returns to foreground it clears the
 * temporal. If the video is playing and at background it stops rendering, so
 * when returning to foreground it will be at a different part, but the last
 * residuals are from the position where it was before going to background. They
 * need to be clear in order to not show wrong residuals when returning to
 * foreground.
 *
 * @class VisibilityController
 */
class VisibilityController {
  /** @private @type {boolean} */
  #hidden = null;

  /** @private @type {string} */
  #visibilityChange = ''

  /** @private @type {function} */
  #onVisibilityChangeHandle = null;

  /** @private @type {function} */
  #clearTemporalCallback = null;

  /**
   * Creates an instance of VisibilityController.
   *
   * @param {Function} clearTemporalCallback
   * @memberof VisibilityController
   */
  constructor(clearTemporalCallback) {
    this.#clearTemporalCallback = clearTemporalCallback;

    // Set the name of the hidden property and the change event for visibility.
    if (typeof document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support.
      this.#hidden = 'hidden';
      this.#visibilityChange = 'visibilitychange';
    } else if (typeof document.msHidden !== 'undefined') {
      this.#hidden = 'msHidden';
      this.#visibilityChange = 'msvisibilitychange';
    } else if (typeof document.webkitHidden !== 'undefined') {
      this.#hidden = 'webkitHidden';
      this.#visibilityChange = 'webkitvisibilitychange';
    }

    if (typeof document.addEventListener !== 'undefined' || !this.#hidden) {
      this.#onVisibilityChangeHandle = this.#handleVisibilityChange.bind(this);
      document.addEventListener(
        this.#visibilityChange,
        this.#handleVisibilityChange.bind(this),
        false
      );
    }
  }

  /**
   * Close the instance.
   *
   * Removes the listened event.
   *
   * @memberof VisibilityController
   */
  _close() {
    document.removeEventListener(this.#visibilityChange, this.#onVisibilityChangeHandle);
  }

  /**
   * Visibility change event.
   *
   * @memberof VisibilityController
   * @private
   */
  #handleVisibilityChange() {
    if (document[this.#hidden]) {
      this.#clearTemporalCallback();
    }
  }
}

export default VisibilityController;
