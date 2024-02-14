/* Copyright (c) V-Nova International Limited 2021-2024. All rights reserved. */

/**
 * The Fullscreen class contains functionality related to fullscreen
 * management. It adds support for fullscreen on webkit (iOS) browsers
 * since fullscreen is not available for a div/canvas tag.
 *
 * @class Fullscreen
 */
class Fullscreen {
  /** @private @type {!boolean} */
  #displayingFullscreen = false;

  /** @private @type {object} */
  #storedStyles = null;

  /** @private @type {object} */
  #emptyStyles = null;

  /** @private @type {LCEVCdec} */
  #lcevcDec = null;

  /** @private @type {HTMLDivElement} */
  #fullScreenElement = null;

  /** @private @type {!boolean} */
  #handlesOnRotationEvents = true;

  /**
   * Construct the Fullscreen object
   *
   * @param {object} lcevcDec LCEVC decoder object
   * @memberof Fullscreen
   */
  constructor(lcevcDec) {
    this.#lcevcDec = lcevcDec;
    this.#displayingFullscreen = false;

    this.#emptyStyles = {
      top: '0',
      left: '0',
      width: '0',
      height: '0',
      margin: '0',
      zIndex: '0',
      color: '0'
    };

    this.#storedStyles = { ...this.#emptyStyles };

    // eslint-disable-next-line
    screen.orientation.addEventListener('change', () => {
      if (!this.webkitHandlesOnRotationEvents()) return;

      const orientation = screen.orientation?.type; // eslint-disable-line
      const fullScreenElement = this.#fullScreenElement;

      if (orientation.includes('landscape') && !this.#displayingFullscreen) {
        // case 1: device is rotated to landscape without being in fullscreen.
        // do not enter fullscreen as this is guaranteed to make the address bar visible
      } else if (orientation.includes('landscape') && this.#displayingFullscreen) {
        // case 2: device is rotated to landscape after being in portrait-fullscreen.
        // re-enter fullscreen to ensure that styles are applied properly for landscape mode
        this.webkitExitFullscreen(fullScreenElement);
        this.webkitEnterFullscreen(fullScreenElement);
      } else if (orientation.includes('portrait') && this.#displayingFullscreen) {
        // case 3: device is rotated back to portrait after being in landscape-fullscreen.
        // exit fullscreen mode
        this.webkitExitFullscreen(fullScreenElement);
      }
    });
  }

  /**
   * Returns a boolean indicating if fullscreen is supported
   * for the provided element in webkit (iOS) browsers. Element
   * should be a div for fullscreen support.
   *
   * @memberof Fullscreen
   * @param {HTMLDivElement} fullScreenElement element to be checked
   * @returns {boolean} true if fullscreen is supported
   * @public
   */
  webkitSupportsFullscreen(fullScreenElement) {
    return (fullScreenElement && fullScreenElement.matches('div')
      && this.#lcevcDec.video.webkitSupportsFullscreen);
  }

  /**
   * Enter fullscreen on a webkit (iOS) browser for a div tag.
   *
   * @memberof Fullscreen
   * @param {HTMLDivElement} fullScreenElement element to be displayed in fullscreen
   * @public
   */
  webkitEnterFullscreen(fullScreenElement) {
    if (!this.webkitSupportsFullscreen(fullScreenElement)) {
      throw new TypeError('webkitEnterFullscreen should only be called on a div element.');
    }

    const element = fullScreenElement.style;
    const body = document.body.style; // eslint-disable-line
    const orientation = screen.orientation?.type; // eslint-disable-line

    // store old CSS styling to return to after exiting fullscreen
    this.#storedStyles = {
      top: element.top,
      left: element.left,
      width: element.width,
      height: element.height,
      margin: element.margin,
      zIndex: element.zIndex,
      color: body.backgroundColor
    };

    // apply CSS styling to simulate fullscreen
    element.top = '0px';
    element.left = '0px';
    element.margin = '1000px 0';
    element.zIndex = '1000';
    body.backgroundColor = 'black';

    if (orientation.includes('landscape')) {
      element.width = '100vw';
      element.height = '100vh';
    } else {
      element.width = '100vw';
    }

    // scroll into view in fullscreen and disable scrolling
    const scrollToElement = () => {
      fullScreenElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      // disable scrolling
      body.overflow = 'hidden';
    };

    // we cannot scroll to element immediately as the styles take a while
    // to be applied and rendered to the DOM
    if (orientation.includes('portrait')) {
      setTimeout(scrollToElement, 10);
    } else {
      setTimeout(scrollToElement, 500);
    }

    this.#fullScreenElement = fullScreenElement;
    this.#displayingFullscreen = true;
  }

  /**
   * Exit fullscreen on a webkit (iOS) browser for a div tag.
   *
   * @memberof Fullscreen
   * @param {HTMLDivElement} fullScreenElement exit fullscreen for this element
   * @public
   */
  webkitExitFullscreen(fullScreenElement) {
    if (!this.webkitSupportsFullscreen(fullScreenElement)) {
      throw new TypeError('webkitExitFullscreen should only be called on a div element.');
    }

    const element = fullScreenElement.style;
    const body = document.body.style; // eslint-disable-line

    // re-enable scrolling
    body.overflow = 'visible';

    // re-apply styles which were saved before entering fullscreen
    element.top = this.#storedStyles.top;
    element.left = this.#storedStyles.left;
    element.width = this.#storedStyles.width;
    element.height = this.#storedStyles.height;
    element.margin = this.#storedStyles.margin;
    element.zIndex = this.#storedStyles.zIndex;

    body.backgroundColor = this.#storedStyles.color;

    // scroll to the top of page
    document.body.scrollIntoView({ behavior: 'smooth' }); // eslint-disable-line

    // clear stored styles
    this.#storedStyles = { ...this.#emptyStyles };
    this.#fullScreenElement = null;
    this.#displayingFullscreen = false;
  }

  /**
   * Returns a boolean indicating if we are currently displaying
   * in fullscreen on webkit (iOS) browsers.
   *
   * @memberof Fullscreen
   * @returns {boolean} true if currently displaying in fullscreen
   * @public
   */
  webkitDisplayingFullscreen() {
    return this.#displayingFullscreen;
  }

  /**
   * Returns a boolean indicating if LCEVCdec will handle device rotation
   * events on webkit (iOS) browsers for entering and exiting fullscreen.
   *
   * @memberof Fullscreen
   * @returns {boolean} true if LCEVCdec will handle device rotation events
   * @public
   */
  webkitHandlesOnRotationEvents() {
    return this.#handlesOnRotationEvents
      && this.#lcevcDec.video.webkitSupportsFullscreen;
  }
}

export default Fullscreen;
