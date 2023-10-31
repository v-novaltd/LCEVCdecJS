import TimeGroup from '../src/residuals/time_group';

describe('TimeGroup', () => {
  const startTime = 0.0;
  const endTime = 0.2;

  const lcevcData = [0, 1, 0, 1, 0, 1, 0, 1];

  it('Should succesfully return an instance', () => {
    const group = new TimeGroup();

    expect(group).toBeDefined();
  });

  it('Should store the correct startTime and endTime', () => {
    const group = new TimeGroup();

    group.startTime = startTime;
    group.endTime = endTime;

    expect(group.startTime).toEqual(startTime);
    expect(group.endTime).toEqual(endTime);
  });

  it('Should store the correct LCEVC data', () => {
    const group = new TimeGroup();

    group.pssData = lcevcData;

    expect(group.pssData).toEqual(lcevcData);
  });
});
