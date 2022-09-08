import { suite, test } from '@testdeck/jest';

import { Builder, Saga } from '../src';

import { Base } from './base';

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

@suite
export class Invoke extends Base {
  cmd = new TestCmd();
  params = { sagas: [TestSaga] };

  @test
  async works() {
    TestSaga.throws = false;

    const step1 = jest.spyOn(TestSaga.prototype, 'step1');
    const step2 = jest.spyOn(TestSaga.prototype, 'step2');
    const step3 = jest.spyOn(TestSaga.prototype, 'step3');

    await this.run();

    expect(step1).toHaveBeenCalledTimes(1);
    expect(step1).toHaveBeenCalledWith(this.cmd);
    expect(step2).toHaveBeenCalledTimes(1);
    expect(step2).toHaveBeenCalledWith(this.cmd);
    expect(step3).toHaveBeenCalledTimes(1);
    expect(step3).toHaveBeenCalledWith(this.cmd);
    expect(this.result).toBeUndefined();
  }

  @test
  async throws() {
    TestSaga.throws = true;

    const step1 = jest.spyOn(TestSaga.prototype, 'step1');
    const step2 = jest.spyOn(TestSaga.prototype, 'step2');
    const step3 = jest.spyOn(TestSaga.prototype, 'step3');

    await this.run();

    expect(step1).toHaveBeenCalledTimes(1);
    expect(step1).toHaveBeenCalledWith(this.cmd);
    expect(step2).toHaveBeenCalledTimes(1);
    expect(step2).toHaveBeenCalledWith(this.cmd);
    expect(step3).toHaveBeenCalledTimes(0);
    expect(this.result).toBeUndefined();
    expect(this.error).toBeInstanceOf(Error);
  }
}
