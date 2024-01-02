/* Copyright (c) V-Nova International Limited 2021-2024. All rights reserved. */

import LCEVC from './lcevc_dec';
import { Events } from './globals/enums';
import { LogLevel } from './log.ts';
import { ready } from './globals/libdpi.ts';
import Supports from './supports/supports';

const LCEVC_DEC_BUILD_DATE = '__BUILD_DATE__';

const { LCEVCdec } = LCEVC;
const { SupportObject } = Supports;

export {
  LCEVC_DEC_BUILD_DATE,
  Events,
  ready,
  LogLevel,
  LCEVCdec,
  SupportObject
};
