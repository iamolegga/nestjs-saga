import type { MockInstance } from 'vitest';

import {
  Builder,
  Saga,
  SagaCompensationError,
  SagaInvocationError,
  SagaStatus,
} from '../src';

import { Base, useSuite } from './base';

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

class Compensate extends Base {
  cmd = new TestCmd();
  params = { sagas: [TestSaga] };

  spyingStep1!: MockInstance<(_: TestCmd) => void>;
  spyingCompensation1!: MockInstance<(_: TestCmd) => void>;
  spyingStep2!: MockInstance<(_: TestCmd) => void>;
  spyingCompensation2!: MockInstance<(_: TestCmd) => void>;

  async before() {
    await super.before();
    this.setupSpyings();
  }

  private setupSpyings() {
    this.spyingStep1 = vi.spyOn(TestSaga.prototype, 'step1');
    this.spyingCompensation1 = vi.spyOn(
      TestSaga.prototype,
      'step1Compensation',
    );
    this.spyingStep2 = vi.spyOn(TestSaga.prototype, 'step2');
    this.spyingCompensation2 = vi.spyOn(
      TestSaga.prototype,
      'step2Compensation',
    );
  }
}

describe('Compensate', () => {
  const getSuite = useSuite(() => new Compensate());

  it('not compensate when no error', async () => {
    const suite = getSuite();
    TestSaga.stepsToComplete = Infinity;

    await suite.run();

    expect(suite.spyingStep1).toHaveBeenCalledTimes(1);
    expect(suite.spyingCompensation1).toHaveBeenCalledTimes(0);
    expect(suite.spyingStep2).toHaveBeenCalledTimes(1);
    expect(suite.spyingCompensation2).toHaveBeenCalledTimes(0);
  });

  it('not compensate when same step failed', async () => {
    const suite = getSuite();
    TestSaga.stepsToComplete = 0;

    await suite.run();

    expect(suite.spyingStep1).toHaveBeenCalledTimes(1);
    expect(suite.spyingCompensation1).toHaveBeenCalledTimes(0);
    expect(suite.spyingStep2).toHaveBeenCalledTimes(0);
    expect(suite.spyingCompensation2).toHaveBeenCalledTimes(0);
  });

  it('compensate when next step failed', async () => {
    const suite = getSuite();
    TestSaga.stepsToComplete = 1;

    await suite.run();

    expect(suite.spyingStep1).toHaveBeenCalledTimes(1);
    expect(suite.spyingCompensation1).toHaveBeenCalledTimes(1);
    expect(suite.spyingStep2).toHaveBeenCalledTimes(1);
    expect(suite.spyingCompensation2).toHaveBeenCalledTimes(0);
    expect(suite.error).toBeInstanceOf(SagaInvocationError);
    expect((suite.error as SagaInvocationError).message).toBe('internal');
  });

  it('fail compensation', async () => {
    const suite = getSuite();
    TestSaga.stepsToComplete = 1;
    TestSaga.failCompensation = true;

    await suite.run();

    expect(suite.spyingStep1).toHaveBeenCalledTimes(1);
    expect(suite.spyingCompensation1).toHaveBeenCalledTimes(1);
    expect(suite.spyingStep2).toHaveBeenCalledTimes(1);
    expect(suite.spyingCompensation2).toHaveBeenCalledTimes(0);
    expect(suite.error).toBeInstanceOf(SagaCompensationError);
    expect((suite.error as SagaCompensationError).message).toBe(
      'compensation error',
    );
  });
});
