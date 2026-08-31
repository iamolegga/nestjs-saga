import { Builder, Saga } from '../src';

import { Base, useSuite } from './base';

class TestCmd {}

@Saga(TestCmd)
class TestSaga {
  static throws = false;

  saga = new Builder<TestCmd>()
    .step('1')
    .invoke(this.step1)
    .step('2')
    .invoke(this.step2)
    .step('3')
    .invoke(this.step3)
    .build();

  step1(cmd: TestCmd) {
    expect(this).toBeInstanceOf(TestSaga);
    expect(cmd).toBeInstanceOf(TestCmd);
  }

  step2(cmd: TestCmd) {
    expect(this).toBeInstanceOf(TestSaga);
    expect(cmd).toBeInstanceOf(TestCmd);
    if (TestSaga.throws) throw new Error('error');
  }

  step3(cmd: TestCmd) {
    expect(this).toBeInstanceOf(TestSaga);
    expect(cmd).toBeInstanceOf(TestCmd);
  }
}

class Invoke extends Base {
  cmd = new TestCmd();
  params = { sagas: [TestSaga] };
}

describe('Invoke', () => {
  const getSuite = useSuite(() => new Invoke());

  it('works', async () => {
    const suite = getSuite();
    TestSaga.throws = false;

    const step1 = vi.spyOn(TestSaga.prototype, 'step1');
    const step2 = vi.spyOn(TestSaga.prototype, 'step2');
    const step3 = vi.spyOn(TestSaga.prototype, 'step3');

    await suite.run();

    expect(step1).toHaveBeenCalledTimes(1);
    expect(step1).toHaveBeenCalledWith(suite.cmd);
    expect(step2).toHaveBeenCalledTimes(1);
    expect(step2).toHaveBeenCalledWith(suite.cmd);
    expect(step3).toHaveBeenCalledTimes(1);
    expect(step3).toHaveBeenCalledWith(suite.cmd);
    expect(suite.result).toBeUndefined();
  });

  it('throws', async () => {
    const suite = getSuite();
    TestSaga.throws = true;

    const step1 = vi.spyOn(TestSaga.prototype, 'step1');
    const step2 = vi.spyOn(TestSaga.prototype, 'step2');
    const step3 = vi.spyOn(TestSaga.prototype, 'step3');

    await suite.run();

    expect(step1).toHaveBeenCalledTimes(1);
    expect(step1).toHaveBeenCalledWith(suite.cmd);
    expect(step2).toHaveBeenCalledTimes(1);
    expect(step2).toHaveBeenCalledWith(suite.cmd);
    expect(step3).toHaveBeenCalledTimes(0);
    expect(suite.result).toBeUndefined();
    expect(suite.error).toBeInstanceOf(Error);
  });
});
