/* Copyright (c) V-Nova International Limited 2021. All rights reserved. */

import { shaderNames } from './shaders/shaders_src';
import {
  _createShader,
  _createBuffer,
  _createFBO,
  _createBDO,
  _deleteShader,
  _deleteFBO,
  _deleteBDO,
  FBO, // eslint-disable-line
  ShaderObj, // eslint-disable-line
  BDO // eslint-disable-line
} from './graphics/webgl';
import { Result } from './globals/enums';

/**
 *
 * @readonly
 * @enum {SampleStatsType}
 * @private
 */
const SampleStatsType = {
  SAMPLER_IDLE: 0,
  SAMPLER_RECORDING: 1
};

// Constants for chart setup. values will never change
const COL_BACK = 0x000000;
const COL_BACK_ALPHA = 0.9;
const COL1 = 0x79c3d0;
const COL2 = 0x50296f;
const COL3 = 0xa23e8a;
const COL4 = 0xf7d584;
const COL_DROP = 0xee6258;
const COL_DISP = 0x5ed675;

const CSS_ZINDEX = 1000;

const DATA_WIDTH = 256;
const CHART_HISTORY = 128;
const RATE_HISTORY = 20;
const RADIAL_SIZE = 100;

/**
 * The Stats class show information about the video, LCEVC and residuals.
 *
 * @class Stats
 */
class Stats {
  /** @private @type {LCEVCdec} */
  #lcevcDec = null;

  /** @private @type {WebGLRenderingContext} */
  #gl = null;

  /** @private @type {string} */
  #textSampleFrames = '';

  /** @private @type {string} */
  #textPresentationFrame = '';

  /** @private @type {number} */
  #sampleRecordEnd = 0;

  /** @private @type {object} */
  #sampleData = {
    processed: 0,
    unique: 0,
    dropped: 0,
    processedAverage: 0
  };;

  /** @private @type {number} */
  #sampleMediaDuration = 1;

  /** @private @type {SampleStatsType} */
  #sampleMode = SampleStatsType.SAMPLER_IDLE;

  /** @private @type {number} */
  #barDataOffset = 0;

  /** @private @type {number} */
  #rateDataOffset = 0;

  /** @private @type {number} */
  #maxSwitch = 0;

  /** @private @type {number} */
  #avUploadBase = 0;

  /** @private @type {number} */
  #avDecodeResidual = 0;

  /** @private @type {number} */
  #avUploadResidual = 0;

  /** @private @type {number} */
  #avRenderShader = 0;

  /** @private @type {number} */
  #currentRenderedFrames = 0;

  /** @private @type {number} */
  #currentDroppedFrames = 0

  /** @private @type {boolean} */
  #renderDecline = false;

  /** @private @type {boolean} */
  #dpsRenderDecline = false;

  /** @private @type {number} */
  #renderDeclineCounter = 0;

  /** @private @type {number} */
  #renderDpsDeclineCounter = 0;

  /** @private @type {number} */
  #timeRatio = 0;

  /** @private @type {boolean} */
  #dpsFlag = false;

  /** @private @type {boolean} */
  #enabled = false;

  /** @private @type {boolean} */
  #enabledAdvanced = false;

  /** @private @type {HTMLElement} */
  #objInfo = null;

  /** @private @type {HTMLElement} */
  #objInfoContent = null;

  /** @private @type {HTMLElement} */
  #objInfoBtn = null;

  /** @private @type {HTMLElement} */
  #objInfoAdvanced = null;

  /** @private @type {Function} */
  #toggleAdvancedBind = null;

  /** @private @type {HTMLCanvasElement} */
  #canvasCharts = null;

  /** @private @type {number} */
  #sampleFrameRate = 0;

  /** @private @type {number} */
  #sampleMediaStart = 0;

  /** @private @type {number} */
  #sampleMediaEnd = 0;

  /** @private @type {FBO} */
  #fboBarData = null;

  /** @private @type {FBO} */
  #fboRateData = null;

  /** @private @type {FBO} */
  #fboRadialData = null;

  /** @private @type {ShaderObj} */
  #shaderBarsData = null;

  /** @private @type {ShaderObj} */
  #shaderBars = null;

  /** @private @type {ShaderObj} */
  #shaderRadial = null;

  /** @private @type {BDO} */
  #barDataBDO = null;

  /** @private @type {BDO} */
  #rateDataBDO = null;

  /** @private @type {BDO} */
  #radialDataBDO = null;

  /**
   * Creates an instance of Stats.
   *
   * @param {!LCEVCdec} lcevcDec The LCEVCdec object.
   * @param {!boolean} enable `true` to enable and render them.
   * @param {!HTMLElement} parentElement The parent element of the video canvas.
   * @memberof Stats
   */
  constructor(lcevcDec, enable, parentElement) {
    this.#lcevcDec = lcevcDec;

    this.#initCharts();

    this._enable(enable, parentElement);
  }

  /**
   * Cloase and remove the stats related data.
   *
   * @returns {Result} The status code.
   * @memberof Stats
   * @public
   */
  _close() {
    this.#destroyInfoBox();
    this.#closeCharts();
    return Result.OK;
  }

  /**
   * Attach and HTMLElement to another.
   *
   * @static
   * @param {HTMLElement} obj The element.
   * @param {HTMLElement} parentElement The parent element.
   * @returns {Result} The status code.
   * @memberof Stats
   * @private
   */
  static #attachElement(obj, parentElement) {
    if (!obj) return Result.FAIL;
    parentElement.appendChild(obj);
    return Result.OK;
  }

  /**
   * Removes an HTMLElement.
   *
   * @static
   * @param {HTMLElement} obj The element.
   * @returns {Result} The status code.
   * @memberof Stats
   * @private
   */
  static #removeElement(obj) {
    if (!obj) return Result.FAIL;
    if (obj.parentElement) obj.parentElement.removeChild(obj);
    return Result.OK;
  }

  /**
   * Creates a stats related HTMLElement.
   *
   * @static
   * @param {string} id The id for the element.
   * @param {string} html The text of the element.
   * @param {string} css The style.
   * @param {HTMLElement} parentElement The parent element where it will be
   *  appened.
   * @returns {HTMLElement}
   * @memberof Stats
   * @private
   */
  static #createElement(id, html, css, parentElement) {
    let obj = document.getElementById(id);
    if (!obj) obj = document.createElement('div');
    obj.id = id;
    obj.innerHTML = html;

    const cssBase = `z-index:${CSS_ZINDEX};`;
    obj.style.cssText = cssBase + css;

    parentElement.appendChild(obj);
    return obj;
  }

  /**
   * Creates the info box.
   *
   * @param {HTMLElement} parentElement The parent element where it will be
   *  appened.
   * @returns {Result} The status code.
   * @memberof Stats
   * @private
   */
  #createInfoBox(parentElement) {
    // container
    this.#objInfo = Stats.#createElement(
      'lcevc-stats-infobox',
      '',
      `background-color:${Stats.#colRGBA(COL_BACK, COL_BACK_ALPHA)};`,
      parentElement
    );

    // content
    this.#objInfoContent = Stats.#createElement(
      'lcevc-stats-infobox-content', '', '', this.#objInfo
    );

    // advanced button
    this.#objInfoBtn = Stats.#createElement(
      'lcevc-stats-infobox-btn', '⇲ …', '', this.#objInfo
    );
    this.#toggleAdvancedBind = Stats.#toggleAdvanced.bind(this);
    this.#objInfoBtn.addEventListener('click', this.#toggleAdvancedBind);

    return Result.OK;
  }

  /**
   * Destroy the info box.
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #destroyInfoBox() {
    if (this.#objInfoBtn) {
      this.#objInfoBtn.removeEventListener('click', this.#toggleAdvancedBind);
    }

    if (this.#objInfoBtn) this.#objInfoBtn.remove();
    if (this.#objInfoContent) this.#objInfoContent.remove();
    if (this.#objInfo) this.#objInfo.remove();

    this.#objInfoBtn = null;
    this.#objInfoContent = null;
    this.#objInfo = null;

    return Result.OK;
  }

  /**
   * Enable or disable the stats.
   *
   * If it is enable, the info box are created.
   * If it is disable, the info box are destroyed.
   *
   * @param {boolean} enabled
   * @param {HTMLElement} parentElement
   * @returns {Result} The status code
   * @memberof Stats
   * @public
   */
  _enable(enabled, parentElement) {
    this.#enabled = enabled;
    if (this.#enabled) {
      this.#createInfoBox(parentElement);
      Stats.#attachElement(this.#canvasCharts, parentElement);
    } else {
      Stats.#removeElement(this.#canvasCharts);
      this.#destroyInfoBox();
    }

    return Result.OK;
  }

  /**
   * Toggle the advanced stats.
   *
   * If it is enable, attach the advanced stats at the bottom of the website.
   * If it is disable, destroy the advanced stats.
   *
   * @static
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  static #toggleAdvanced() {
    this.#enabledAdvanced = !this.#enabledAdvanced;
    if (this.#enabledAdvanced) {
      const parent = document.body;
      this.#objInfoAdvanced = Stats.#createElement('lcevc-stats-infobox-advanced', '', '', parent);
    } else {
      Stats.#removeElement(this.#objInfoAdvanced);
      this.#objInfoAdvanced = null;
    }

    return Result.OK;
  }

  /**
   * Updates the stats.
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @public
   */
  _update() {
    if (!this.#enabled) return Result.FAIL;
    this.#objInfoContent.innerHTML = `${this.#textSampleFrames}<br/>${this.#textPresentationFrame}`;
    return Result.OK;
  }

  /**
   * Loops through the frames in the queue to update stats.
   *
   * If advanced stats are enabled it will go into a lot more detail of each
   * frame, and may have a slight time cost running every frame. For developer
   * debugging only.
   *
   * @param {!Array} queueFrames The queue frame of the Queue object.
   * @param {!number} presentationIndex The presentation index.
   * @param {!number} now The actual time.
   * @param {!ResidualStore} residualStore The ResidualStore object.
   * @returns {Result} The status code
   * @memberof Stats
   * @public
   */
  _processQueue(queueFrames, presentationIndex, now, residualStore) {
    // Process simple
    for (let i = 0; i < queueFrames.length; i += 1) {
      const queueFrame = queueFrames[i];
      // send frames to stats for sampling (only old frames)
      if (queueFrame.presentationTime < now && i !== presentationIndex) {
        this.#processSample(queueFrame);
      }
    }

    // Process for advanced stats
    if (this.#enabledAdvanced) {
      let htmlFrame = `
      <table id="lcevc-stats-infobox-advanced-frame">
      <tr><td>Current Frame</td></tr>
      <tr></tr>
      <tr><td>#ftext#</td></tr>
      </table>
      `;

      let htmlQueue = `
      <table id="lcevc-stats-infobox-advanced-queue">
      <tr><td colspan="3">Queued Frames</td></tr>
      <tr>
        <td>Display</td>
        <td>Properties</td>
        <td>Parsed Residuals</td>
      </tr>
      <tr></tr>
      #qtext#
      </table>
      `;

      let htmlResiduals = `
      <table id="lcevc-stats-infobox-advanced-residuals">
      <tr><td colspan="6">Residual Store</td></tr>
      <tr>
        <td>Index</td>
        <td>Time</td>
        <td>FRate</td>
        <td>Lev</td>
        <td>KeyF</td>
        <td>pssData</td>
      </tr>
      #rtext#
      </table>
      `;

      const br = String.fromCharCode(10);
      let ftext = '';
      let qtext = '';
      let rtext = '';

      // TODO: Use a Heap.
      // Sort by time (does NOT change original array).
      let maxMediaTime = 0;
      const ref = [];
      for (let i = 0; i < queueFrames.length; i += 1) {
        const queueFrame = queueFrames[i];
        if (!queueFrame.available) {
          ref.push([i, queueFrame.mediaTime]);
          maxMediaTime = Math.max(maxMediaTime, queueFrame.mediaTime);
        }
      }
      ref.sort(function(a, b){ return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0 }); // eslint-disable-line

      // loop through sorted reference
      for (let j = 0; j < ref.length; j += 1) {
        const i = ref[j][0];
        const queueFrame = queueFrames[i];

        qtext += '<tr>';

        // Display info.
        qtext += '<td>';
        if (i === presentationIndex) {
          // Current frame
          qtext += `Current Frame${br}`;

          ftext += `<u>Lcevc Info:</u>${br}`;
          ftext += `hasBase:   ${queueFrame.lcevcInfo.hasBase}${br}`;
          ftext += `hasHigh:   ${queueFrame.lcevcInfo.hasHigh}${br}`;
          ftext += `is1D:      ${queueFrame.lcevcInfo.is1D}${br}`;
          ftext += `dither:    ${queueFrame.lcevcInfo.ditherStrength}${br}`;
          ftext += br;
          ftext += `<u>Render Sizes:</u>${br}`;
          ftext += `input:     ${queueFrame.inputWidth}x${queueFrame.inputHeight}${br}`;
          ftext += `inputTrue: ${queueFrame.inputWidthTrue}x${queueFrame.inputHeightTrue}${br}`;
          ftext += `output:    ${queueFrame.outputWidth}x${queueFrame.outputHeight}${br}`;
          ftext += `lcevcInfo: ${queueFrame.lcevcInfo.width}x${queueFrame.lcevcInfo.height}${br}`;
          ftext += `fbo:       ${queueFrame.fbo.width}x${queueFrame.fbo.height}${br}`;
          ftext += br;

          // get residual info for this
          const segmentSize = 1; // assumes it is 1. maybe wrong. TODO - make segmentSize public
          const segmentIndex = Math.floor(queueFrame.mediaTime / segmentSize);
          const segment = residualStore._getSegment(segmentIndex);
          if (!segment) {
            rtext += `<tr><td>ERROR. Segment ${segmentIndex} not found</td></tr>`;
          } else {
            for (let k = 0; k < segment.groupKeys.length; k += 1) {
              const groupKey = segment.groupKeys[k];
              const group = segment.groups[groupKey];
              rtext += '<tr>';
              rtext += `<td>${group.index}</td>${br}`;
              rtext += `<td>${group.startTime} - ${group.endTime}</td>${br}`;
              rtext += `<td>${group.frameRate}</td>${br}`;
              rtext += `<td>${group.level}</td>${br}`;
              rtext += `<td>${group.keyframe}</td>${br}`;
              rtext += `<td>${(group.pssData ? group.pssData.length : 'null')}</td>${br}`;
              rtext += '</tr>';
            }
          }
        } else if (queueFrame.presentationTime < now) {
          // Old frame
          qtext += `Old Frame${br}`;
        } else {
          // New frame
          qtext += `New Frame${br}`;
        }
        qtext += `schedule: ${(queueFrame.presentationTime - now).toFixed(3)}ms${br}`;
        qtext += `displayCount: ${queueFrame.timingStats.displayCount}${br}`;
        qtext += '</td>';

        qtext += '<td>';
        qtext += `mediaTime:${queueFrame.mediaTime}s${br}`;
        qtext += `drift:${queueFrame.drift}${br}`;
        qtext += `frameRate:${queueFrame.frameRate}${br}`;
        qtext += `hasLcevc:${queueFrame.hasLcevc}${br}`;
        qtext += '</td>';

        // residual frames
        if (queueFrame.lcevcInfo.parseLog !== null) {
          qtext += '<td>';
          for (let k = 0; k < queueFrame.lcevcInfo.parseLog.length; k += 1) {
            if (k > 0) qtext += br;
            const group = queueFrame.lcevcInfo.parseLog[k];
            qtext += group.startTime;
            if (group.keyframe) {
              qtext += ' Keyframe';
            }
          }
          qtext += '</td>';
        }
        qtext += '</tr>';
      }

      htmlFrame = htmlFrame.replace('#ftext#', ftext);
      htmlQueue = htmlQueue.replace('#qtext#', qtext);
      htmlResiduals = htmlResiduals.replace('#rtext#', rtext);

      this.#objInfoAdvanced.innerHTML = htmlFrame + htmlQueue + htmlResiduals;
    }
    return Result.OK;
  }

  /**
   * Uses the processing data from a QueueFrame to update the statistics.
   *
   * Should only be called after the frame has been displayed so that we
   * include all data (including displayCount)
   *
   * @param {!QueueFrame} queueFrame The QueueFrame.
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #processSample(queueFrame) {
    const now = performance.now();

    // Ignore empty frames.
    if (queueFrame.available) return Result.FAIL;

    // Abort current recording if framerate changed.
    if (this.#sampleMode === SampleStatsType.SAMPLER_RECORDING) {
      // Moved from 0.1 to 0.6 to offset for the webm modifications
      if (Math.abs(queueFrame.frameRate - this.#sampleFrameRate) > 0.6) {
        this.#sampleMode = SampleStatsType.SAMPLER_IDLE;
      }
    }

    // Handle idle state (start recording)
    if (this.#sampleMode === SampleStatsType.SAMPLER_IDLE) {
      this.#sampleMode = SampleStatsType.SAMPLER_RECORDING;

      this.#sampleRecordEnd = now + this.#sampleMediaDuration * 1000;
      this.#sampleFrameRate = queueFrame.frameRate;
      this.#sampleMediaStart = queueFrame.mediaTime;
      this.#sampleMediaEnd = this.#sampleMediaStart
        + this.#sampleMediaDuration - 0.5 / this.#sampleFrameRate;

      // Reset.
      this.#sampleData.processed = 0;
      this.#sampleData.unique = 0;
      this.#sampleData.dropped = 0;
    }

    // Recording mode.
    if (this.#sampleMode === SampleStatsType.SAMPLER_RECORDING) {
      // Only include media inside sample window.
      if (
        queueFrame.mediaTime >= this.#sampleMediaStart
        && queueFrame.mediaTime <= this.#sampleMediaEnd
      ) {
        this.#sampleData.processed += 1;
        if (queueFrame.timingStats.displayCount > 0) {
          this.#sampleData.unique += 1;
        } else {
          this.#sampleData.dropped += 1;
        }
      }

      // Check for end of processing.
      if (now >= this.#sampleRecordEnd) {
        // Render on chart.
        this.#addSample(
          this.#sampleFrameRate,
          this.#sampleData.processed,
          this.#sampleData.unique,
          this.#sampleData.dropped
        );

        // Store result.
        let t = '';
        const br = '<br/>';
        t += `fps: ${this.#sampleFrameRate.toFixed(3)}${br}`;
        t += `processed: ${this.#sampleData.processed}${br}`;
        t += `display:   ${this.#sampleData.unique}${br}`;
        t += `drop:      ${this.#sampleData.dropped}${br}`;
        this.#textSampleFrames = t;
        this.#currentRenderedFrames = this.#sampleData.processed;
        this.#currentDroppedFrames = this.#sampleData.dropped;
        // Start next sample.
        this.#sampleMode = SampleStatsType.SAMPLER_IDLE;
      }
    }

    // Add to charts.
    this.#addFrameToChart(
      queueFrame.frameRate,
      queueFrame.timingStats.uploadBase,
      queueFrame.timingStats.decodeResidual,
      queueFrame.timingStats.uploadResidual,
      queueFrame.timingStats.renderShader + queueFrame.timingStats.presentationShader
    );

    return Result.OK;
  }

  /**
   * Update info of currently shown Queueframe.
   *
   * @param {QueueFrame} queueFrame The QueueFrame.
   * @returns {Result} The status code.
   * @memberof Stats
   * @public
   */
  _setPresentationFrame(queueFrame) {
    const br = '<br/>';
    let t = '';

    // Size
    t += `size: ${queueFrame.outputWidth} x ${queueFrame.outputHeight}${br}`;

    // Lcevc
    const lcevcOn = '<span style="color:#6f6">active</span>';
    const lcevcOff = '<span style="color:#f66">inactive</span>';
    t += `lcevc: ${queueFrame.lcevcInfo.parse ? lcevcOn : lcevcOff}${br}`;

    // Dps
    const dpsOn = '<span style="color:#6f6">active</span>';
    const dpsOff = '<span style="color:#f66">inactive</span>';
    const dps = this.#lcevcDec.isPerformanceScalingActive
      && this.#lcevcDec.isPerformanceScalingEnabled && !this.#dpsRenderDecline;
    t += `dps: ${dps ? dpsOn : dpsOff}${br}`;

    // Video
    const videoDisplayOn = '<span style="color:#6f6">active</span>';
    const videoDisplayOff = '<span style="color:#f66">inactive</span>';
    const videoDisplay = this.#lcevcDec.isPerformanceScalingActive
      && this.#lcevcDec.isPerformanceScalingEnabled && this.#dpsRenderDecline;
    t += `baseOnly: ${videoDisplay ? videoDisplayOn : videoDisplayOff}${br}`;
    t += `currentLevel: ${this.#lcevcDec.currentLevel}${br}`;
    t += `nextLevel: ${this.#lcevcDec.nextLevel}${br}`;

    // Parsing
    /*
    if (dps) {
      t += `parse: n/a${br}`;
    } else {
      const parseOn = '<span style="color:#6f6">parsing</span>';
      const parseOff = '<span style="color:#f66">await keyframe</span>';
      const parseStats = this.#lcevcDec.decoderParseStats;
      t += `parse: ${(!parseStats[1]) ? parseOn : parseOff}${br}`;
    }
    t += br;
    */

    this.#textPresentationFrame = t;

    return Result.OK;
  }

  /**
   * Returns the time ratio.
   *
   * @readonly
   * @returns {number} The time ratio.
   * @memberof Stats
   * @public
   */
  get _getTimeRatio() {
    return this.#timeRatio;
  }

  /**
   * Returns if rendering LCEVC should be enable or disable depending how many
   * frames are being drop.
   *
   * @readonly
   * @returns {boolean} `true` if it need to be disable, otherwise `false`.
   * @memberof Stats
   * @public
   */
  get _getRenderDecline() {
    return this.#renderDecline;
  }

  /**
   * Set DPS Decode Regression Counter if rendering LCEVC should be enable or
   * disable depending how many frames are being droped.
   *
   * @readonly
   * @returns {boolean} `true` if it need to be disable, otherwise `false`.
   * @memberof Stats
   * @public
   */
  get _incrementMaxSwitch() {
    this.#maxSwitch += 1;
    return this.#maxSwitch;
  }

  /**
  *
  * @readonly
  * @returns {boolean}
  * @memberof Stats
  * @public
  */
  get _getDPSRenderDecline() {
    return this.#dpsRenderDecline;
  }

  /**
  *
  * @readonly
  * @returns {number}
  * @memberof Stats
  * @public
  */
  get _getCurrentRenderedFrames() {
    return this.#currentRenderedFrames;
  }

  /**
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #initCharts() {
    this.#initChartsCanvas();
    this.#initChartsShaders();

    return Result.OK;
  }

  /**
   * Initialise the stats charts canvas.
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #initChartsCanvas() {
    // Create webgl display canvas.
    const canvas = document.createElement('canvas');
    canvas.width = RATE_HISTORY * 5 + 10 + CHART_HISTORY * 2 + 10 + RADIAL_SIZE;
    canvas.height = RADIAL_SIZE;
    canvas.style.cssText = `
    position: absolute;
    display: block;
    top: 0;
    right: 0;
    padding: 10px;
    z-index: ${CSS_ZINDEX};
    background-color: ${Stats.#colRGBA(COL_BACK, COL_BACK_ALPHA)};`;

    const gl = canvas.getContext('webgl');
    this.#canvasCharts = canvas;
    this.#gl = gl;

    // Config gl
    this.#gl.clearColor(
      ((COL_BACK >> 16) & 0xff) / 0xff,
      ((COL_BACK >> 8) & 0xff) / 0xff,
      ((COL_BACK >> 0) & 0xff) / 0xff,
      0.0
    );
    this.#gl.clear(this.#gl.DEPTH_BUFFER_BIT | this.#gl.COLOR_BUFFER_BIT);
    this.#gl.enable(this.#gl.BLEND);
    this.#gl.blendFuncSeparate(
      this.#gl.SRC_ALPHA, this.#gl.ONE_MINUS_SRC_ALPHA, this.#gl.ONE, this.#gl.ONE_MINUS_SRC_ALPHA
    );

    // Key
    const key = document.createElement('div');

    key.style.cssText = `
    position: absolute;
    display: block;
    top: 0;
    pointer-events: none;
    font-family: arial;
    font-size: 10px;
    color: #fff;
    z-index: ${CSS_ZINDEX};
    right: ${RADIAL_SIZE + 10}px;`;

    key.innerHTML = `<b style="color:${Stats.#colHex(COL1)}">&#9608</b> upload base
    <b style="color:${Stats.#colHex(COL2)}">&#9608</b> emscripten
    <b style="color:${Stats.#colHex(COL3)}">&#9608</b> upload residual
    <b style="color:${Stats.#colHex(COL4)}">&#9608</b> shaders
    &nbsp;&nbsp;&nbsp;`;

    this.#canvasCharts.key = key;
    this.#canvasCharts.addEventListener('mouseover', this.#showKey);
    this.#canvasCharts.addEventListener('mouseout', this.#hideKey);

    return Result.OK;
  }

  /**
   * Initialise the stats charts shaders.
   *
   * @returns {Result} The status code.
   */
  #initChartsShaders() {
    this.#fboBarData = _createFBO(this.#gl, DATA_WIDTH, CHART_HISTORY);
    this.#fboRateData = _createFBO(this.#gl, DATA_WIDTH, RATE_HISTORY);
    this.#fboRadialData = _createFBO(this.#gl, DATA_WIDTH, 1);

    // Bars data.

    this.#shaderBarsData = _createShader(
      this.#gl,
      shaderNames.stats_data_vert,
      shaderNames.stats_data_frag,
      ['aBars'],
      [
        'dataTextureSize',
        'offset'
      ]
    );

    // Create gl buffer.
    const QUAD_COUNT = 10;
    const VERTS_PER_QUAD = 6;
    const FLOATS_PER_VERT = 3;

    // Rate display.

    // Bars display.

    this.#shaderBars = _createShader(
      this.#gl,
      shaderNames.stats_bar_vert,
      shaderNames.stats_bar_frag,
      ['aPos', 'aUV'],
      [
        'dataTexture',
        'dataTextureSize',
        'offset',
        'viewportSize',
        'spacing'
      ]
    );

    this.#shaderBars.buffers = {
      aPos: _createBuffer(this.#gl, [
        -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0
      ]),
      aUV: _createBuffer(this.#gl, [
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0
      ])
    };

    // Radial display.
    this.#shaderRadial = _createShader(
      this.#gl,
      shaderNames.stats_radial_vert,
      shaderNames.stats_radial_frag,
      ['aPos', 'aUV'],
      [
        'dataTexture',
        'viewportSize',
        'timeRatio'
      ]
    );

    this.#shaderRadial.buffers = {
      aPos: _createBuffer(this.#gl, [
        -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0
      ]),
      aUV: _createBuffer(this.#gl, [
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0
      ])
    };

    // Buffer data.
    this.#barDataBDO = _createBDO(this.#gl, new Float32Array(
      QUAD_COUNT
      * VERTS_PER_QUAD
      * FLOATS_PER_VERT
    ));

    this.#rateDataBDO = _createBDO(this.#gl, new Float32Array(
      QUAD_COUNT
      * VERTS_PER_QUAD
      * FLOATS_PER_VERT
    ));

    this.#radialDataBDO = _createBDO(this.#gl, new Float32Array(
      QUAD_COUNT
      * VERTS_PER_QUAD
      * FLOATS_PER_VERT
    ));

    //
    this.#renderCharts();

    return Result.OK;
  }

  /**
   * Close and remove the charts.
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #closeCharts() {
    // Reset values.
    this.#barDataOffset = 0;
    this.#rateDataOffset = 0;

    this.#avUploadBase = 0;
    this.#avDecodeResidual = 0;
    this.#avUploadResidual = 0;
    this.#avRenderShader = 0;

    // Remove GL.
    _deleteBDO(this.#gl, this.#barDataBDO);
    _deleteBDO(this.#gl, this.#rateDataBDO);
    _deleteBDO(this.#gl, this.#radialDataBDO);

    _deleteFBO(this.#gl, this.#fboBarData);
    _deleteFBO(this.#gl, this.#fboRateData);
    _deleteFBO(this.#gl, this.#fboRadialData);

    _deleteShader(this.#gl, this.#shaderBarsData);
    _deleteShader(this.#gl, this.#shaderBars);
    _deleteShader(this.#gl, this.#shaderRadial);
    this.#gl = null;

    // Remove canvas.
    if (this.#canvasCharts.key.parentElement) {
      this.#canvasCharts.key.parentElement.removeChild(this.#canvasCharts.key);
    }
    this.#canvasCharts.removeEventListener('mouseover', this.#showKey);
    this.#canvasCharts.removeEventListener('mouseout', this.#hideKey);

    if (this.#canvasCharts.parentElement) {
      this.#canvasCharts.parentElement.removeChild(this.#canvasCharts);
    }
    this.#canvasCharts.width = 0;
    this.#canvasCharts.height = 0;
    this.#canvasCharts = null;

    return Result.OK;
  }

  /**
   * Returns a color style using a hex and alpha values.
   *
   * @static
   * @param {!number} hex The hex color value.
   * @param {!number} alpha The alpha value.
   * @returns {string} The color style.
   * @memberof Stats
   * @private
   */
  static #colRGBA(hex, alpha) {
    return `rgba(${(hex >> 16) & 0xff},${(hex >> 8) & 0xff},${(hex >> 0) & 0xff},${alpha})`;
  }

  /**
   * Returns a color style using a hex value
   *
   * @static
   * @param {!number} hex The hex color value.
   * @returns {string} the color style.
   * @memberof Stats
   * @private
   */
  static #colHex(hex) {
    return `#${(`000000${hex.toString(16)}`).substr(-6)}`;
  }

  /**
   * Show the legend names of the chart.
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #showKey() {
    this.parentElement.appendChild(this.key);
    return Result.OK;
  }

  /**
   * Hide the legend names of the chart.
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #hideKey() {
    this.parentElement.removeChild(this.key);
    return Result.OK;
  }

  /**
   * Adds a frame of timing data to the radial chart and the bar chart.
   *
   * @param {!number} frameRate The frame rate.
   * @param {!number} uploadBase The base time.
   * @param {!number} decodeResidual The decode time.
   * @param {!number} uploadResidual The upload time.
   * @param {!number} renderShader The shader time.
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #addFrameToChart(frameRate, uploadBase, decodeResidual, uploadResidual, renderShader) {
    const FLOATS_PER_VERT = 3;

    const attribute = this.#shaderBarsData.attributes.aBars;
    let bdo;
    // Bar chart.
    bdo = this.#barDataBDO;

    // Raw data.
    let t0 = 0;
    let t1 = t0 + uploadBase;
    let t2 = t1 + decodeResidual;
    let t3 = t2 + uploadResidual;
    let t4 = t3 + renderShader;
    const timeTotal = 1000 / frameRate;

    // Create chart data.
    bdo.array.pointer = 0;
    Stats.#addChartDataBar(bdo.array, COL1, t0, t1, timeTotal);
    Stats.#addChartDataBar(bdo.array, COL2, t1, t2, timeTotal);
    Stats.#addChartDataBar(bdo.array, COL3, t2, t3, timeTotal);
    Stats.#addChartDataBar(bdo.array, COL4, t3, t4, timeTotal);
    Stats.#addChartDataBar(bdo.array, COL_BACK, t4, timeTotal, timeTotal);

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, bdo.buffer);
    this.#gl.vertexAttribPointer(attribute, FLOATS_PER_VERT, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(attribute);
    this.#gl.bufferSubData(this.#gl.ARRAY_BUFFER, 0, bdo.array.subarray(0, bdo.array.pointer));

    // Radial chart.

    bdo = this.#radialDataBDO;

    // .
    const mf = 0.95;
    this.#avUploadBase = uploadBase * (1 - mf) + this.#avUploadBase * mf;
    this.#avDecodeResidual = decodeResidual * (1 - mf) + this.#avDecodeResidual * mf;
    this.#avUploadResidual = uploadResidual * (1 - mf) + this.#avUploadResidual * mf;
    this.#avRenderShader = renderShader * (1 - mf) + this.#avRenderShader * mf;

    t0 = 0;
    t1 = t0 + this.#avUploadBase;
    t2 = t1 + this.#avDecodeResidual;
    t3 = t2 + this.#avUploadResidual;
    t4 = t3 + this.#avRenderShader;
    const tmax = t4;

    if (!this.#dpsFlag) {
      this.#dpsManager(tmax, timeTotal);
    }

    // Create chart data.
    bdo.array.pointer = 0;
    Stats.#addChartDataBar(bdo.array, COL1, t0, t1, tmax);
    Stats.#addChartDataBar(bdo.array, COL2, t1, t2, tmax);
    Stats.#addChartDataBar(bdo.array, COL3, t2, t3, tmax);
    Stats.#addChartDataBar(bdo.array, COL4, t3, t4, tmax);

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, bdo.buffer);
    this.#gl.vertexAttribPointer(attribute, FLOATS_PER_VERT, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(attribute);
    this.#gl.bufferSubData(this.#gl.ARRAY_BUFFER, 0, bdo.array.subarray(0, bdo.array.pointer));

    // Run data texture shaders.
    this.#barDataOffset = (this.#barDataOffset + 1) % CHART_HISTORY;
    this.#renderBarData();
    this.#renderRadialData();

    // Redraw charts.
    this.#renderCharts();

    return Result.OK;
  }

  /**
   * Handle DPS Status
   *
   * @param {!number} tmax Total time required to render the frame.
   * @memberof Stats
   * @private
   */
  async #dpsManager(tmax) {
    this.#dpsFlag = true;
    let decodeFps = this.#sampleFrameRate.toFixed(3);

    if (!this.#lcevcDec.videoFrameCallbackEnabled && this.#renderDeclineCounter < 120) {
      this.#sampleData.processedAverage += this.#sampleData.processed;
      decodeFps = this.#sampleData.processed;
      this.#sampleData.processedAverage = this.#sampleFrameRate.toFixed(3)
        - this.#sampleData.processed;
    }
    if (this.#maxSwitch > 10) {
      this.#renderDecline = true;
      this.#dpsRenderDecline = true;
    } else if (this.#maxSwitch > 5) {
      this.#renderDecline = true;
    } else if (this.#currentRenderedFrames !== 0
      && this.#currentRenderedFrames - this.#currentDroppedFrames
      < 0.6 * decodeFps) {
    // Percentage of time that has been used. If current rendered frames are < 75% of the
    // framerate of the video,dps is activated with a threshold of 3 seconds
      if (this.#renderDeclineCounter > 179) {
        this.#renderDecline = true;
        this.#renderDeclineCounter = 0;
      } else {
        this.#renderDeclineCounter += 1;
      }
    } else {
      this.#renderDecline = false;
      this.#dpsRenderDecline = false;
      this.#renderDeclineCounter = 0;
    }

    if (this.#maxSwitch <= 10 && this.#renderDecline === true) {
      // If there is even a little decline (<70%)in dps, it means that the hardware is not
      // able to decode frames properly. Hence dpsRenderdecline which shows videotag
      // with a threshold of 3 seconds
      if (this.#currentRenderedFrames - this.#currentDroppedFrames
        < 0.8 * decodeFps) {
        if (this.#renderDpsDeclineCounter > 179) {
          this.#dpsRenderDecline = true;
          this.#renderDpsDeclineCounter = 0;
        } else {
          this.#renderDpsDeclineCounter += 1;
        }
      } else {
        this.#dpsRenderDecline = false;
        this.#renderDpsDeclineCounter = 0;
      }
    }
    this.#timeRatio = tmax / (1000 / decodeFps);
    this.#dpsFlag = false;
  }

  /**
   * Add a sample to the stats.
   *
   * @param {!number} target The total number of frames.
   * @param {!number} processed The processed frames.
   * @param {!number} display The displayed frames.
   * @param {!number} drop The dropped frames.
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #addSample(target, processed, display, drop) {
    const t0 = 0;
    const t1 = t0 + drop;
    const t2 = t1 + display;

    // Sometimes total might be more than target (by 1).
    const tmax = Math.max(target, processed);

    let arr = this.#rateDataBDO.array;
    arr.pointer = 0;
    Stats.#addChartDataBar(arr, COL_DROP, t0, t1, tmax);
    Stats.#addChartDataBar(arr, COL_DISP, t1, t2, tmax);
    Stats.#addChartDataBar(arr, COL_BACK, t2, tmax, tmax);

    const FLOATS_PER_VERT = 3;

    const attribute = this.#shaderBarsData.attributes.aBars;
    arr = this.#rateDataBDO.array;

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#rateDataBDO.buffer);
    this.#gl.vertexAttribPointer(attribute, FLOATS_PER_VERT, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(attribute);
    this.#gl.bufferSubData(
      this.#gl.ARRAY_BUFFER,
      0,
      this.#rateDataBDO.array.subarray(0, arr.pointer)
    );

    this.#rateDataOffset = (this.#rateDataOffset + 1) % RATE_HISTORY;
    this.#renderRateData();

    return Result.OK;
  }

  /**
   * Add the stats data to the bar chart.
   *
   * @param {!number[]} arr The data.
   * @param {!number} col The column position.
   * @param {!number} a The start time.
   * @param {!number} b The end time.
   * @param {!number} max The max time.
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  static #addChartDataBar(arr, col, a, b, max) {
    const x0 = (a / max) * DATA_WIDTH;
    const x1 = (b / max) * DATA_WIDTH;

    Stats.#addChartDataQuad(arr, x0, 0, x1, 1, col);

    return Result.OK;
  }

  /**
   * Add data to the chart as Quads.
   *
   * @param {!number[]} arr The data.
   * @param {!number} x0 The first position of the X axis.
   * @param {!number} y0 The first position of the X axis.
   * @param {!number} x1 The second position of the Y axis.
   * @param {!number} y1 The second position of the Y axis.
   * @param {!number} col The column position.
   * @returns {Result} The status code
   * @memberof Stats
   * @static
   * @private
   */
  static #addChartDataQuad(arr, x0, y0, x1, y1, col) {
    const i = arr.pointer;

    // ABC
    arr[i + 0] = x0; // eslint-disable-line no-param-reassign
    arr[i + 1] = y0; // eslint-disable-line no-param-reassign
    arr[i + 2] = col; // eslint-disable-line no-param-reassign
    arr[i + 3] = x1; // eslint-disable-line no-param-reassign
    arr[i + 4] = y0; // eslint-disable-line no-param-reassign
    arr[i + 5] = col; // eslint-disable-line no-param-reassign
    arr[i + 6] = x0; // eslint-disable-line no-param-reassign
    arr[i + 7] = y1; // eslint-disable-line no-param-reassign
    arr[i + 8] = col; // eslint-disable-line no-param-reassign

    // DCB
    arr[i + 9] = x1; // eslint-disable-line no-param-reassign
    arr[i + 10] = y1; // eslint-disable-line no-param-reassign
    arr[i + 11] = col; // eslint-disable-line no-param-reassign
    arr[i + 12] = x0; // eslint-disable-line no-param-reassign
    arr[i + 13] = y1; // eslint-disable-line no-param-reassign
    arr[i + 14] = col; // eslint-disable-line no-param-reassign
    arr[i + 15] = x1; // eslint-disable-line no-param-reassign
    arr[i + 16] = y0; // eslint-disable-line no-param-reassign
    arr[i + 17] = col; // eslint-disable-line no-param-reassign

    arr.pointer = i + 18; // eslint-disable-line no-param-reassign

    return Result.OK;
  }

  /**
   * Renders the bar chart.
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #renderBarData() {
    const shader = this.#shaderBarsData;

    // Render program.
    this.#gl.useProgram(shader.program);
    this.#gl.viewport(0, 0, DATA_WIDTH, CHART_HISTORY);

    this.#gl.uniform2f(shader.uniforms.dataTextureSize, DATA_WIDTH, CHART_HISTORY);
    this.#gl.uniform1f(shader.uniforms.offset, this.#barDataOffset);

    const attribute = shader.attributes.aBars;
    const FLOATS_PER_VERT = 3;

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#barDataBDO.buffer);
    this.#gl.vertexAttribPointer(attribute, FLOATS_PER_VERT, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(attribute);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, this.#fboBarData.framebuffer);
    // Paint.
    this.#gl.drawArrays(this.#gl.TRIANGLES, 0, this.#barDataBDO.array.pointer / FLOATS_PER_VERT);

    return Result.OK;
  }

  /**
   * Renders the rate chart.
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #renderRateData() {
    const shader = this.#shaderBarsData;

    // Render program.
    this.#gl.useProgram(shader.program);
    this.#gl.viewport(0, 0, DATA_WIDTH, RATE_HISTORY);

    this.#gl.uniform2f(shader.uniforms.dataTextureSize, DATA_WIDTH, RATE_HISTORY);
    this.#gl.uniform1f(shader.uniforms.offset, this.#rateDataOffset);

    const attribute = shader.attributes.aBars;
    const FLOATS_PER_VERT = 3;

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#rateDataBDO.buffer);
    this.#gl.vertexAttribPointer(attribute, FLOATS_PER_VERT, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(attribute);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, this.#fboRateData.framebuffer);

    // Paint.
    this.#gl.drawArrays(this.#gl.TRIANGLES, 0, this.#rateDataBDO.array.pointer / FLOATS_PER_VERT);

    return Result.OK;
  }

  /**
   * Renders the radial chart.
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #renderRadialData() {
    const shader = this.#shaderBarsData;

    // Render program.
    this.#gl.useProgram(shader.program);
    this.#gl.viewport(0, 0, DATA_WIDTH, 1);

    this.#gl.uniform2f(shader.uniforms.dataTextureSize, DATA_WIDTH, 1);
    this.#gl.uniform1f(shader.uniforms.offset, 0);

    const attribute = shader.attributes.aBars;
    const FLOATS_PER_VERT = 3;

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#radialDataBDO.buffer);
    this.#gl.vertexAttribPointer(attribute, FLOATS_PER_VERT, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(attribute);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, this.#fboRadialData.framebuffer);

    // Paint.
    this.#gl.drawArrays(this.#gl.TRIANGLES, 0, this.#radialDataBDO.array.pointer / FLOATS_PER_VERT);

    return Result.OK;
  }

  /**
   * Renders stats on the screen.
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #renderCharts() {
    // Clear.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.clear(this.#gl.COLOR_BUFFER_BIT);

    // Render charts.
    this.#renderRadialChart();
    this.#renderBarChart();
    this.#renderBarChart2();

    return Result.OK;
  }

  /**
   * Renders the radial chart.
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #renderRadialChart() {
    const shader = this.#shaderRadial;

    const w = this.#canvasCharts.width - RADIAL_SIZE;

    // Render program.
    this.#gl.useProgram(shader.program);
    this.#gl.viewport(w, 0, RADIAL_SIZE, RADIAL_SIZE);

    // Texture.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, this.#fboRadialData.texture);
    this.#gl.uniform1i(shader.uniforms.dataTexture, 0);

    // Other uniforms.
    this.#gl.uniform1f(shader.uniforms.viewportSize, RADIAL_SIZE);
    this.#gl.uniform1f(shader.uniforms.timeRatio, this.#timeRatio);

    // Attributes.
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.aPos);
    this.#gl.vertexAttribPointer(shader.attributes.aPos, 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes.aPos);

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.aUV);
    this.#gl.vertexAttribPointer(shader.attributes.aUV, 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes.aUV);

    // Run.
    this.#gl.drawArrays(this.#gl.TRIANGLES, 0, 6);

    return Result.OK;
  }

  /**
   * Renders the bar chart.
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #renderBarChart() {
    const shader = this.#shaderBars;

    const x = RATE_HISTORY * 5 + 10;
    const w = CHART_HISTORY * 2;

    // Render program.
    this.#gl.useProgram(shader.program);
    this.#gl.viewport(x, 0, w, RADIAL_SIZE);

    // Texture.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, this.#fboBarData.texture);
    this.#gl.uniform1i(shader.uniforms.dataTexture, 0);

    // Other uniforms.
    this.#gl.uniform2f(shader.uniforms.dataTextureSize, DATA_WIDTH, CHART_HISTORY);
    this.#gl.uniform1f(shader.uniforms.offset, this.#barDataOffset);
    this.#gl.uniform2f(shader.uniforms.viewportSize, w, RADIAL_SIZE);
    this.#gl.uniform2f(shader.uniforms.spacing, 2, 0);

    // Attributes.
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.aPos);
    this.#gl.vertexAttribPointer(shader.attributes.aPos, 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes.aPos);

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.aUV);
    this.#gl.vertexAttribPointer(shader.attributes.aUV, 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes.aUV);

    // Run.
    this.#gl.drawArrays(this.#gl.TRIANGLES, 0, 6);

    return Result.OK;
  }

  /**
   * Renders the bar chart.
   *
   * @returns {Result} The status code
   * @memberof Stats
   * @private
   */
  #renderBarChart2() {
    const shader = this.#shaderBars;

    const x = 0;
    const w = RATE_HISTORY * 5;

    // Render program.
    this.#gl.useProgram(shader.program);
    this.#gl.viewport(x, 0, w, RADIAL_SIZE);

    // Texture.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, this.#fboRateData.texture);
    this.#gl.uniform1i(shader.uniforms.dataTexture, 0);

    // Other uniforms.
    this.#gl.uniform2f(shader.uniforms.dataTextureSize, DATA_WIDTH, RATE_HISTORY);
    this.#gl.uniform1f(shader.uniforms.offset, this.#rateDataOffset);
    this.#gl.uniform2f(shader.uniforms.viewportSize, w, RADIAL_SIZE);
    this.#gl.uniform2f(shader.uniforms.spacing, 4, 1);

    // Attributes.
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.aPos);
    this.#gl.vertexAttribPointer(shader.attributes.aPos, 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes.aPos);

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.aUV);
    this.#gl.vertexAttribPointer(shader.attributes.aUV, 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes.aUV);

    // Run.
    this.#gl.drawArrays(this.#gl.TRIANGLES, 0, 6);

    return Result.OK;
  }
}

export default Stats;
