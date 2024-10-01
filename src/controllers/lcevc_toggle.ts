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

import { lcevcToogleImg } from './lcevc_assets';
import { Result } from '../globals/enums';

let showArrowOnce = true;

declare global {
  interface Window {
    lcevcToogleIDs:number[];
  }
}

const LOGO_WIDTH = 100;
const LOGO_HEIGHT = 20;
const LOGO_MARGIN = 6;

const TOGGLE_WIDTH = 64;
const TOGGLE_HEIGHT = 17;
const TOGGLE_MARGIN = 6;

const LCEVC_TOGGLE_STYLE = `
.toggleLCEVC-img {
  width: ${LOGO_WIDTH}px;
  height: ${LOGO_HEIGHT}px;
  margin: ${LOGO_MARGIN}px;
}

.onoffswitch-checkbox {
  display: none;
}

.onoffswitch-label {
  position: absolute;
  width: ${TOGGLE_WIDTH}px;
  height: ${TOGGLE_HEIGHT}px;
  margin: ${TOGGLE_MARGIN}px;
  display: inline-block;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid #999999;
  border-radius: 20px;
}

.dropdown-img {
  position: absolute;
  width: 60px;
  height: 100px;
  margin: ${TOGGLE_MARGIN}px;
  display: inline-block;
  overflow: hidden;
  bottom: 54px;
}

.onoffswitch-inner {
  display: inline-block;
  width: 200%;
  margin-left: -100%;
  -moz-transition: margin 0.3s ease-in 0s;
  -webkit-transition: margin 0.3s ease-in 0s;
  -o-transition: margin 0.3s ease-in 0s;
  transition: margin 0.3s ease-in 0s;
}

.onoffswitch-inner:before, .onoffswitch-inner:after {
  display: inline-block;
  float: left;
  width: ${TOGGLE_WIDTH}px;
  height: ${TOGGLE_HEIGHT + 4}px;
  padding: 0;
  line-height: ${TOGGLE_HEIGHT + 4}px;
  font-size: 14px;
  color: white;
  font-family: Trebuchet, Arial, sans-serif;
  font-weight: bold;
  -moz-box-sizing: border-box;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
}

.onoffswitch-inner:before {
  content: "ON";
  padding-left: 5px;
  margin-top: -2px;
  background-color: #ffffff;
  color: #000000;
}

.onoffswitch-inner:after {
  content: "OFF";
  padding-right: 5px;
  margin-top: -2px;
  background-color: #B3B3B3;
  color: #000000;
  text-align: right;
}

.onoffswitch-switch {
  position: absolute;
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #000000;
  border: 2px solid #999999;
  border-radius: 20px;
  top: 3px;
  bottom: 0;
  right: 46px;
  -moz-transition: all 0.3s ease-in 0s;
  -webkit-transition: all 0.3s ease-in 0s;
  -o-transition: all 0.3s ease-in 0s;
  transition: all 0.3s ease-in 0s;
}

.onoffswitch-checkbox:checked + .onoffswitch-label .onoffswitch-inner {
  margin-left: 0;
}

.onoffswitch-checkbox:checked + .onoffswitch-label .onoffswitch-switch {
  right: 4px;
}
`;

/**
 * The LcevcToggle class creates and controls the toggle button to enable and
 * disable LCEVC.
 *
 * @class LcevcToggle
 */
class LcevcToggle {
  #lcevcDec;

  #toggleImg: HTMLImageElement;

  #dropdownImg: HTMLImageElement;

  #toggleInput: HTMLInputElement;

  #toggleLabel: HTMLLabelElement;

  #onOff: boolean = true;

  /**
   * Creates an instance of LcevcToggle.
   *
   * @param {LCEVCdec} lcevcDec A LCEVCdec object.
   * @param {HTMLElement} videoControlsElement The controls HTMLElement.
   * @memberof LcevcToggle
   */
  constructor(lcevcDec, videoControlsElement: HTMLElement) {
    const style = document.createElement('style');
    style.id = 'lcevc-styles';
    style.innerHTML = LCEVC_TOGGLE_STYLE;
    document.getElementsByTagName('head')[0].appendChild(style);

    this.#lcevcDec = lcevcDec;
    this.#toggleImg = document.createElement('img');
    this.#toggleImg.className = 'toggleLCEVC-img';
    this.#toggleImg.src = lcevcToogleImg;
    this.#toggleImg.crossOrigin = 'anonymous';
    this.#toggleImg.alt = 'LCEVC';
    videoControlsElement.appendChild(this.#toggleImg);

    // Always initialise this.#dropdownImg, otherwise it may be undefined
    this.#dropdownImg = document.createElement('img');
    if (showArrowOnce) {
      showArrowOnce = false;
      this.#dropdownImg.className = 'dropdown-img';
      this.#dropdownImg.dataset.decDropDownImg = '';
      this.#dropdownImg.src = 'https://dyctis843rxh5.cloudfront.net/v-nova/dropdown_white.gif';
      this.#dropdownImg.alt = '^';
      videoControlsElement.appendChild(this.#dropdownImg);
    }

    // Get from a global array of toggles id the next one.
    // If it don't exist, create the new one.
    let nextID;
    if (window.lcevcToogleIDs) {
      nextID = window.lcevcToogleIDs.slice(-1)[0] + 1;
    } else {
      nextID = 0;
      window.lcevcToogleIDs = [];
    }
    window.lcevcToogleIDs.push(nextID);
    const toggleID = `myonoffswitch${nextID}`;

    this.#toggleInput = document.createElement('input');
    this.#toggleInput.name = 'onoffswitch';
    this.#toggleInput.id = toggleID;
    this.#toggleInput.type = 'checkbox';
    this.#toggleInput.className = 'onoffswitch-checkbox';
    this.#toggleInput.checked = true;
    this.#toggleInput.onchange = this._onToggleLcevc.bind(this);
    videoControlsElement.appendChild(this.#toggleInput);

    this.#toggleLabel = document.createElement('label');
    this.#toggleLabel.className = 'onoffswitch-label';
    this.#toggleLabel.htmlFor = toggleID;
    videoControlsElement.appendChild(this.#toggleLabel);

    const innerSpan = document.createElement('span');
    innerSpan.className = 'onoffswitch-inner';
    this.#toggleLabel.appendChild(innerSpan);

    const switchSpan = document.createElement('span');
    switchSpan.className = 'onoffswitch-switch';
    this.#toggleLabel.appendChild(switchSpan);
  }

  /**
   * Remove the elements.
   *
   * @returns {Result} The status code.
   * @memberof LcevcToggle
   */
  public _close() {
    showArrowOnce = true;
    this.#toggleImg.remove();
    this.#toggleInput.remove();

    while (this.#toggleLabel.hasChildNodes()) {
      this.#toggleLabel.lastChild?.remove();
    }

    this.#toggleLabel.remove();

    return Result.OK;
  }

  /**
   * Returns the width of the toggle button.
   *
   * @returns {number} The width of the button.
   * @readonly
   * @memberof LcevcToggle
   */
  get _offsetSize() {
    return this.#toggleImg.offsetWidth + LOGO_MARGIN * 2
      + this.#toggleInput.offsetWidth + this.#toggleLabel.offsetWidth + TOGGLE_MARGIN * 2;
  }

  /**
   * Returns the status of the button.
   *
   * @returns {boolean} `true` if enable, otherwise `false`.
   * @readonly
   * @memberof LcevcToggle
   */
  get _isEnable() {
    return this.#onOff;
  }

  /**
   * Toggle behaviour.
   *
   * If enable, set the Full shader and tell LCEVCdec that LCEVC is enabled.
   * If disable, set the Simple shader and tell LCEVCdec that LCEVC is disabled.
   *
   * @returns {Result} The status code.
   * @private
   * @memberof LcevcToggle
   */
  private _onToggleLcevc() {
    this.#onOff = !this.#onOff;
    this.#lcevcDec.setConfigOption('shaderPath',
      this.#lcevcDec.getConfigOption('shaderPath') !== 0 ? 0 : 1);
    this.#dropdownImg.style.display = 'none';
    this.#lcevcDec._enableLcevc(this.#onOff);
    this.#lcevcDec.video.dispatchEvent(new Event('render'));

    return Result.OK;
  }
}

export default LcevcToggle;
