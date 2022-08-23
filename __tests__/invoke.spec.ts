import { suite, test } from '@testdeck/jest';

import { Builder, Saga } from '../src';

import { Base } from './base';

class TestCmd {}

@Saga(TestCmd)
class TestSaga {
  saga = new Builder<TestCmd>().step('1').invoke(this.step1).build();

  step1(_: TestCmd) {
    expect(this).toBeInstanceOf(TestSaga);
  }
}

@suite
export class Invoke extends Base {
  cmd = new TestCmd();
  params = { sagas: [TestSaga] };

  @test
  async work() {
    const spying = jest.spyOn(TestSaga.prototype, 'step1');

    await this.run();

    expect(spying).toHaveBeenCalledTimes(1);
    expect(spying).toHaveBeenCalledWith(this.cmd);
    expect(this.result).toBeUndefined();
  }
}
