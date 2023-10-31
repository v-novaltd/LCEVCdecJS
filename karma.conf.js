// Karma configuration

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://www.npmjs.com/search?q=keywords:karma-adapter
    frameworks: ['browserify', 'jasmine'],

    // list of files / patterns to load in the browser
    files: [
      'test/**/*.test.js',
      { pattern: 'test/assets/**/*.mp4', watched: false, included: false, served: true, nocache: true },
      { pattern: 'test/assets/**/*.yuv', watched: false, included: false, served: true, nocache: true },
      { pattern: 'test/assets/*.webm', watched: false, included: false, served: true, nocache: true },
      { pattern: 'test/assets/*.ts', watched: false, included: false, served: true, nocache: true },
      { pattern: 'test/assets/nal-units/*.bin', watched: false, included: false, served: true, nocache: true },
      { pattern: 'dist/*.wasm', watched: true, included: false, served: true, nocache: true },
      { pattern: 'dist/*.js', watched: true, included: true, served: true, nocache: true },
      { pattern: 'https://cdnjs.cloudflare.com/ajax/libs/mux.js/6.2.0/mux.min.js', watched: true, included: true, served: true, nocache: true },
      { pattern: 'test/players/shaka/shaka-player.compiled.debug.js', watched: true, included: true, served: true, nocache: true },
      // { pattern: 'test/sync-assets/**/*.*', watched: false, included: false, served: true, nocache: true },
    ],

    // list of files / patterns to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://www.npmjs.com/search?q=keywords:karma-preprocessor
    preprocessors: {
      'test/**/*.test.js': 'browserify'
    },

    browserify: {
      debug: true,
      configure: function(bundle) {
        bundle.once('prebundle', function() {
          bundle.plugin('tsify').transform('babelify');
        });
      },
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://www.npmjs.com/search?q=keywords:karma-reporter
    reporters: process.env.BROWSERSTACK_USERNAME ? ['progress', 'BrowserStack'] : ['progress'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,
    captureTimeout: 120000, // it was already there
    browserDisconnectTimeout: 120000,
    browserDisconnectTolerance: 10,
    browserNoActivityTimeout: 120000, // by default 10000

    // available browser launchers: https://www.npmjs.com/search?q=keywords:karma-launcher
    // if env variable BROWSERSTACK_USERNAME is set, run the tests remotely on BrowserStack
    browsers: process.env.BROWSERSTACK_USERNAME ? ['BrowserStack_Chrome'] : ['Local_Chrome'],

    customLaunchers: {
      Local_Chrome: {
          base: 'Chrome',
          flags: ['--no-sandbox', '--js-flags="--max_old_space_size=4096"', '--remote-debugging-port=9222'],
      },
      BrowserStack_Chrome: {
        base: 'BrowserStack',
        browser: 'chrome',
        browser_version: '111.0',
        os: 'OS X',
        os_version: 'Ventura'
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser instances should be started simultaneously
    concurrency: Infinity,

    proxies: {
      '/*.wasm': '/base/dist/*.wasm',
    },

    // accept command line parameters when running karma start (eg. --os=windows, --browser=chrome)
    client: {
      os: config.os,
      browser: config.browser,
      sync: config.sync
    },
  })
}

