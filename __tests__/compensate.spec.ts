import { suite, test } from '@testdeck/jest';

import {
  Builder,
  Saga,
  SagaCompensationError,
  SagaInvocationError,
  SagaStatus,
} from '../src';

import { Base } from './base';

class TestCmd {}

@Saga(TestCmd)
class TestSaga {
  static stepsToComplete = Infinity;
  static failCompensation = false;

  saga = new Builder<TestCmd>()
    .step('1')
    .invoke(this.step1)
    .withCompensation(this.step1Compensation)
    .step()
    .invoke(this.step2)
    .withCompensation(this.step2Compensation)
    .build();

  step1(_: TestCmd) {
    expect(this.saga.status).toBe(SagaStatus.InProgress);
    this.doStep();
  }

  step1Compensation(_: TestCmd) {
    expect(this.saga.status).toBe(SagaStatus.InCompensation);
    if (TestSaga.failCompensation) throw 'compensation error';
  }

  step2Compensation(_: TestCmd) {
    // noop
  }

  step2(_: TestCmd) {
    this.doStep();
  }

  private doStep() {
    if (TestSaga.stepsToComplete-- <= 0) throw new Error('internal');
  }
}

@suite
export class Compensate extends Base {
  cmd = new TestCmd();
  params = { sagas: [TestSaga] };

  private spyingStep1!: jest.SpyInstance<void, [_: TestCmd]>;
  private spyingCompensation1!: jest.SpyInstance<void, [_: TestCmd]>;
  private spyingStep2!: jest.SpyInstance<void, [_: TestCmd]>;
  private spyingCompensation2!: jest.SpyInstance<void, [_: TestCmd]>;

  @test
  async 'not compensate when no error'() {
    TestSaga.stepsToComplete = Infinity;

    await this.run();

    expect(this.spyingStep1).toHaveBeenCalledTimes(1);
    expect(this.spyingCompensation1).toHaveBeenCalledTimes(0);
    expect(this.spyingStep2).toHaveBeenCalledTimes(1);
    expect(this.spyingCompensation2).toHaveBeenCalledTimes(0);
  }

  @test
  async 'not compensate when same step failed'() {
    TestSaga.stepsToComplete = 0;

    await this.run();

    expect(this.spyingStep1).toHaveBeenCalledTimes(1);
    expect(this.spyingCompensation1).toHaveBeenCalledTimes(0);
    expect(this.spyingStep2).toHaveBeenCalledTimes(0);
    expect(this.spyingCompensation2).toHaveBeenCalledTimes(0);
  }

  @test
  async 'compensate when next step failed'() {
    TestSaga.stepsToComplete = 1;

    await this.run();

    expect(this.spyingStep1).toHaveBeenCalledTimes(1);
    expect(this.spyingCompensation1).toHaveBeenCalledTimes(1);
    expect(this.spyingStep2).toHaveBeenCalledTimes(1);
    expect(this.spyingCompensation2).toHaveBeenCalledTimes(0);
    expect(this.error).toBeInstanceOf(SagaInvocationError);
    expect((this.error as SagaInvocationError).message).toBe('internal');
  }

  @test
  async 'fail compensation'() {
    TestSaga.stepsToComplete = 1;
    TestSaga.failCompensation = true;

    await this.run();

    expect(this.spyingStep1).toHaveBeenCalledTimes(1);
    expect(this.spyingCompensation1).toHaveBeenCalledTimes(1);
    expect(this.spyingStep2).toHaveBeenCalledTimes(1);
    expect(this.spyingCompensation2).toHaveBeenCalledTimes(0);
    expect(this.error).toBeInstanceOf(SagaCompensationError);
    expect((this.error as SagaCompensationError).message).toBe(
      'compensation error',
    );
  }

  async before() {
    await super.before();
    this.setupSpyings();
  }

  private setupSpyings() {
    this.spyingStep1 = jest.spyOn(TestSaga.prototype, 'step1');
    this.spyingCompensation1 = jest.spyOn(
      TestSaga.prototype,
      'step1Compensation',
    );
    this.spyingStep2 = jest.spyOn(TestSaga.prototype, 'step2');
    this.spyingCompensation2 = jest.spyOn(
      TestSaga.prototype,
      'step2Compensation',
    );
  }
}
