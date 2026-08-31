import { Builder, Saga } from '../src';

import { Base, useSuite } from './base';

class TestCmd {}

@Saga(TestCmd)
class TestSaga {
  saga = new Builder<TestCmd>()
    .step()
    .invoke(this.step1)
    .step()
    .invoke(this.step2)
    .step()
    .invoke(this.step3)
    .build();

  counter = 0;

  private step1(_: TestCmd) {
    this.counter++;
    expect(this.counter).toBe(1);
  }
  private step2(_: TestCmd) {
    this.counter++;
    expect(this.counter).toBe(2);
  }
  private step3(_: TestCmd) {
    this.counter++;
    expect(this.counter).toBe(3);
  }
}

class State extends Base {
  cmd = new TestCmd();
  params = { sagas: [TestSaga] };
}

describe('State', () => {
  const getSuite = useSuite(() => new State());

  it('instance created for each command sent', async () => {
    const suite = getSuite();
    await suite.run();
    await suite.run();
  });
});
