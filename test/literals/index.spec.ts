import { ActionTypes, STATUS } from 'literals';

describe('constants', () => {
  it('should match the snapshot', () => {
    expect(ActionTypes).toMatchSnapshot();
    expect(STATUS).toMatchSnapshot();
  });
});
