class DemuxerLoader {
  /** @public @type {Promise} */
  promise = null;

  /** @public @type {string} */
  version = null;

  /** @public @type {boolean} */
  loadOnStartup = true;

  /** @private @type {Function} */
  #urlMethod = null;

  /** @private @type {Function} */
  #loadMethod = null;

  /** @private @type {number} */
  #state = 0;

  /**
   * Creates an instance of DemuxerLoader, which allows loading MP4Box and EBML.
   *
   * @param {Function} url function which will return the url for loading the demuxer
   * @param {Function} load the load function which will be invoked to load the url
   * @memberof DemuxerLoader
   */
  constructor(url, load) {
    this.#urlMethod = url;
    this.#loadMethod = load;
  }

  /**
   * Starts the load process and invokes the loadMethod passed in via the constructor
   *
   * @returns {*} passes through the return value of the supplied load function
   * @memberof DemuxerLoader
   */
  load() {
    if (!this.version) {
      throw new Error('The demuxer version has not been specified. Please set a demuxer version.');
    }
    this.#state = DemuxerLoader.State.LOADING;
    return this.#loadMethod(this.#urlMethod(this.version), this.done.bind(this));
  }

  /**
   * Returns true if the loader is in waiting state.
   *
   * @returns {boolean} true if the loader is in waiting state
   * @memberof DemuxerLoader
   */
  isWaiting() {
    return this.#state === DemuxerLoader.State.IDLE;
  }

  /**
   * Returns true if the loader is in loading state.
   *
   * @returns {boolean} true if the loader is in loading state
   * @memberof DemuxerLoader
   */
  isLoading() {
    return this.#state === DemuxerLoader.State.LOADING;
  }

  /**
   * Returns true if the loader is in loaded state. The state only switches to loaded if
   * done() is called.
   *
   * @returns {boolean} true if the loader is in loaded state
   * @memberof DemuxerLoader
   */
  isLoaded() {
    return this.#state === DemuxerLoader.State.LOADED;
  }

  /**
   * Marks the load as finished. This should be called externally.
   *
   * @memberof DemuxerLoader
   */
  done() {
    this.#state = DemuxerLoader.State.LOADED;
  }

  static State = {
    IDLE: 0,
    LOADING: 1,
    LOADED: 2,
    ERROR: 3
  }
}

export default DemuxerLoader;
