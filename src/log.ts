/* Copyright (c) V-Nova International Limited 2021-2024. All rights reserved. */

// eslint-disable-next-line no-shadow
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARNING = 2,
  INFO = 3,
  DEBUG = 4,
  VERBOSE = 5,
}

let logLevel: LogLevel = LogLevel.NONE;

/**
 * @param {!number} level
 */
export function setLogLevel(level: LogLevel) {
  logLevel = level;
}

/**
 * @returns {number}
 */
export function getLogLevel() {
  return logLevel;
}

export namespace Log {
  /**
   * Log an info message.
   *
   * @exports
   * @param {...any[]} args
   */
  export function info(...args: any[]): void {
    if (logLevel >= LogLevel.INFO) {
      console.info(`[LCEVC INFO] ${args}`); // eslint-disable-line
    }
  }

  /**
   * Log a debug message.
   *
   * @exports
   * @param {...any[]} args
   */
  export function debug(...args: any[]): void {
    if (logLevel >= LogLevel.DEBUG) {
      console.debug(`[LCEVC DEBUG] ${args}`); // eslint-disable-line
    }
  }

  /**
   * Log an error message.
   *
   * @exports
   * @param {...any[]} args
   */
  export function error(...args: any[]): void {
    if (logLevel >= LogLevel.ERROR) {
      console.error(`[LCEVC ERROR] ${args}`); // eslint-disable-line
    }
  }

  /**
   * Log an assert message.
   *
   * @exports
   * @param {...any[]} args
   */
  export function assert(...args: any[]): void {
    if (logLevel >= LogLevel.VERBOSE) {
      console.assert(`[LCEVC ASSERT] ${args}`); // eslint-disable-line
    }
  }

  /**
   * Log a normal message.
   *
   * @exports
   * @param {...any[]} args
   */
  export function msg(...args: any[]): void {
    if (logLevel >= LogLevel.VERBOSE) {
      console.log(`[LCEVC LOG] ${args}`); // eslint-disable-line
    }
  }

  /**
   * Log a warning message.
   *
   * @exports
   * @param {...any[]} args
   */
  export function warn(...args: any[]): void {
    if (logLevel >= LogLevel.WARNING) {
      if (navigator.userAgent.search('Trident/7.0') > -1) {
        console.log(`[LCEVC WARN] ${args}`); // eslint-disable-line
      } else {
        console.warn(`[LCEVC WARN] ${args}`); // eslint-disable-line
      }
    }
  }

  /**
   * Log an info message, regardless of LogLevel
   *
   * @exports
   * @param {...any[]} args
   */
  export function always(...args: any[]): void {
    console.info(`[LCEVC] ${args}`); // eslint-disable-line
  }
}
