/* Copyright (c) V-Nova International Limited 2021-2024. All rights reserved. */

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
