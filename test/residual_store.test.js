import ResidualStore from '../src/residuals/residual_store';

describe('ResidualStore', () => {
  const LCEVCdecMock = {
    video: {
      currentTime: 0
    },
    setFirstKeyframeOffset() {},
    controls: {
      _checkIsLive() {}
    }
  };

  it('Should succesfully return an instance', () => {
    const store = new ResidualStore(LCEVCdecMock);

    expect(store).toBeDefined();
  });

  it('Should store and retrieve LCEVC data at a particular timestamp', () => {
    const store = new ResidualStore(LCEVCdecMock);

    const timestamp = 0.5;
    const duration = 0.2;
    const lcevcData = [0, 1, 0, 1, 1, 1, 0, 1];

    store._addData(timestamp, 1, duration, true, 0, lcevcData, 0);

    const hasData = store._hasLcevcData(timestamp);
    const storedData = store._getGroup(timestamp).pssData;

    expect(hasData).toBe(true);
    expect(storedData).toEqual(lcevcData);
  });
});
