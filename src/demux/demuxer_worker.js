/* Copyright (c) V-Nova International Limited 2021. All rights reserved. */

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

    lcevcDemuxer._resetLcevcMap();
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
