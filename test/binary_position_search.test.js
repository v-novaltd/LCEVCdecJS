import { _binaryPositionSearch } from '../src/algorithms/binary_position_search.ts';

describe('binaryPositionSearch', () => {
  it('Should correctly process simple data', () => {
    const dataToAdd = [1, 2, 2, 3];
    const array = [];
    for (let i = 0; i < dataToAdd.length; i += 1) {
      const pos = _binaryPositionSearch(array, dataToAdd[i]);
      array.splice(pos, 0, dataToAdd[i]);
    }

    expect(array.length).toEqual(dataToAdd.length);

    for (let i = 0; i < dataToAdd.length; i += 1) {
      expect(array[i]).toEqual(dataToAdd[i]);
    }
  });

  it('Should correctly process sequential data', () => {
    const array = [];
    const size = 100;
    for (let i = 0; i < size; i += 1) {
      const pos = _binaryPositionSearch(array, i);
      array.splice(pos, 0, i);
    }

    expect(array.length).toEqual(size);

    for (let i = 0; i < size; i += 1) {
      expect(array[i]).toEqual(i);
    }
  });

  it('Should correctly process inversed sequential data', () => {
    const array = [];
    const size = 100;
    for (let i = size - 1; i >= 0; i -= 1) {
      const pos = _binaryPositionSearch(array, i);
      array.splice(pos, 0, i);
    }

    expect(array.length).toEqual(size);

    for (let i = 0; i < size; i += 1) {
      expect(array[i]).toEqual(i);
    }
  });

  it('Should correctly process an array of even first, odd last', () => {
    const array = [];
    const size = 100;
    for (let i = 0; i < size; i += 2) {
      const pos = _binaryPositionSearch(array, i);
      array.splice(pos, 0, i);
    }
    for (let i = 1; i < size; i += 2) {
      const pos = _binaryPositionSearch(array, i);
      array.splice(pos, 0, i);
    }

    expect(array.length).toEqual(size);

    for (let i = 0; i < size; i += 1) {
      expect(array[i]).toEqual(i);
    }
  });
});
