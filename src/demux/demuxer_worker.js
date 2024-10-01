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

import { setLogLevel } from '../log.ts';
import Demuxer from './demuxer';

/** @type {Demuxer} */
let lcevcDemuxer = null;

self.addEventListener('message', (e) => { // eslint-disable-line no-restricted-globals
  const { id } = e.data;

  if (id === 'config') {
    setLogLevel(e.data.logLevel);
    return;
  }

  if (id === 'userConfig') {
    const { config } = e.data;
    Demuxer.MP4Demuxer.version = config.mp4boxVersion;
    Demuxer.WebMDemuxer.version = config.ebmlVersion;
    Demuxer.MP4Demuxer.loadOnStartup = config.mp4boxLoadOnStartup;
    Demuxer.WebMDemuxer.loadOnStartup = config.ebmlLoadOnStartup;
    return;
  }

  if (!lcevcDemuxer || id === 'reset') {
    lcevcDemuxer = new Demuxer(self);// eslint-disable-line no-restricted-globals
    lcevcDemuxer._demuxInit();
  }

  if (id === 'demux') {
    const mp4Data = e.data.videoData.buffer;
    const { ptsStart } = e.data;
    const { ptsEnd } = e.data;
    const { level } = e.data;
    const { containerFormat } = e.data;
    const { isRawLcevc } = e.data;

    lcevcDemuxer._resetLcevcMap();
    lcevcDemuxer._setIsRawLcevc(isRawLcevc);
    lcevcDemuxer._selectDemuxer(mp4Data, ptsStart, ptsEnd, level, containerFormat);
  }

  if (id === 'rawLCEVC') {
    const {
      lcevcData,
      timestamp,
      timescale,
      duration,
      baseDecodeTime
    } = e.data;
    lcevcDemuxer._rawLcevcData(lcevcData, timestamp, timescale, duration, baseDecodeTime);
  }

  if (id === 'rawNalLCEVC') {
    const {
      lcevcData,
      timestamp,
      naluFormat
    } = e.data;
    lcevcDemuxer._rawNalLcevcData(lcevcData, timestamp, naluFormat);
  }
});
