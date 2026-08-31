import {
  Builder,
  Saga,
  SagaCompensationError,
  SagaInvocationError,
} from '../src';

import { Base, useSuite } from './base';

class TestCmd {}
class TestCmdResult {}

function throwInInvocation(idx: number) {
  return () => {
    if (TestSaga.throwOnInvocation === idx) throw new Error(idx.toString());
  };
}

function throwInCompensation(idx: number) {
  return () => {
    if (TestSaga.throwOnCompensation === idx) throw new Error(idx.toString());
  };
}

function reset() {
  TestSaga.throwOnInvocation = -1;
  TestSaga.throwOnCompensation = -1;
  TestSaga.throwOnResult = false;
}

@Saga(TestCmd)
class TestSaga {
  static throwOnInvocation = -1;
  static throwOnCompensation = -1;
  static throwOnResult = false;

  saga = new Builder<TestCmd, TestCmdResult>()
    .step()
    .invoke(throwInInvocation(0))
    .withCompensation(throwInCompensation(0))
    .step('named')
    .invoke(throwInInvocation(1))
    .withCompensation(throwInCompensation(1))
    .step()
    .invoke(this.classMethodInvoke)
    .withCompensation(this.classMethodCompensate)
    .return(this.buildResult)
    .build();

  classMethodInvoke() {
    throwInInvocation(2)();
  }
  classMethodCompensate() {
    throwInCompensation(2)();
  }

  buildResult(): TestCmdResult {
    if (TestSaga.throwOnResult) throw new Error('result');
    return new TestCmdResult();
  }
}

class Return extends Base {
  cmd = new TestCmd();
  params = { sagas: [TestSaga] };
}

describe('Return', () => {
  const getSuite = useSuite(() => new Return());

  it('invocation: unnamed step + anonymous fn', async () => {
    const suite = getSuite();
    reset();
    TestSaga.throwOnInvocation = 0;
    await suite.run();
    expect(suite.error).toBeInstanceOf(SagaInvocationError);
    expect((suite.error as SagaInvocationError).step).toBe('step0');
  });

  it('invocation: step with name', async () => {
    const suite = getSuite();
    reset();
    TestSaga.throwOnInvocation = 1;
    await suite.run();
    expect(suite.error).toBeInstanceOf(SagaInvocationError);
    expect((suite.error as SagaInvocationError).step).toBe('named');
  });

  it('invocation: unnamed step + class method', async () => {
    const suite = getSuite();
    reset();
    TestSaga.throwOnInvocation = 2;
    await suite.run();
    expect(suite.error).toBeInstanceOf(SagaInvocationError);
    expect((suite.error as SagaInvocationError).step).toBe(
      TestSaga.prototype.classMethodInvoke.name,
    );
  });

  it('on result', async () => {
    const suite = getSuite();
    reset();
    TestSaga.throwOnResult = true;
    await suite.run();
    expect(suite.error).toBeInstanceOf(SagaInvocationError);
    expect((suite.error as SagaInvocationError).step).toBe(
      TestSaga.prototype.buildResult.name,
    );
  });

  it('compensation: unnamed step + anonymous fn', async () => {
    const suite = getSuite();
    reset();
    TestSaga.throwOnInvocation = 1;
    TestSaga.throwOnCompensation = 0;
    await suite.run();
    expect(suite.error).toBeInstanceOf(SagaCompensationError);
    expect((suite.error as SagaCompensationError).step).toBe('step0');
  });

  it('compensation: step with name', async () => {
    const suite = getSuite();
    reset();
    TestSaga.throwOnInvocation = 2;
    TestSaga.throwOnCompensation = 1;
    await suite.run();
    expect(suite.error).toBeInstanceOf(SagaCompensationError);
    expect((suite.error as SagaCompensationError).step).toBe('named');
  });

  it('compensation: unnamed step + class method', async () => {
    const suite = getSuite();
    reset();
    TestSaga.throwOnResult = true;
    TestSaga.throwOnCompensation = 2;
    await suite.run();
    expect(suite.error).toBeInstanceOf(SagaCompensationError);
    expect((suite.error as SagaCompensationError).step).toBe(
      TestSaga.prototype.classMethodCompensate.name,
    );
  });
});
