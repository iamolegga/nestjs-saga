import { suite, test } from '@testdeck/jest';

import {
  Builder,
  Saga,
  SagaCompensationError,
  SagaInvocationError,
} from '../src';

import { Base } from './base';

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

@suite
export class Return extends Base {
  cmd = new TestCmd();
  params = { sagas: [TestSaga] };

  @test
  async 'invocation: unnamed step + anonymous fn'() {
    reset();
    TestSaga.throwOnInvocation = 0;
    await this.run();
    expect(this.error).toBeInstanceOf(SagaInvocationError);
    expect((this.error as SagaInvocationError).step).toBe('step0');
  }

  @test
  async 'invocation: step with name'() {
    reset();
    TestSaga.throwOnInvocation = 1;
    await this.run();
    expect(this.error).toBeInstanceOf(SagaInvocationError);
    expect((this.error as SagaInvocationError).step).toBe('named');
  }

  @test
  async 'invocation: unnamed step + class method'() {
    reset();
    TestSaga.throwOnInvocation = 2;
    await this.run();
    expect(this.error).toBeInstanceOf(SagaInvocationError);
    expect((this.error as SagaInvocationError).step).toBe(
      TestSaga.prototype.classMethodInvoke.name,
    );
  }

  @test
  async 'on result'() {
    reset();
    TestSaga.throwOnResult = true;
    await this.run();
    expect(this.error).toBeInstanceOf(SagaInvocationError);
    expect((this.error as SagaInvocationError).step).toBe(
      TestSaga.prototype.buildResult.name,
    );
  }

  @test
  async 'compensation: unnamed step + anonymous fn'() {
    reset();
    TestSaga.throwOnInvocation = 1;
    TestSaga.throwOnCompensation = 0;
    await this.run();
    expect(this.error).toBeInstanceOf(SagaCompensationError);
    expect((this.error as SagaCompensationError).step).toBe('step0');
  }

  @test
  async 'compensation: step with name'() {
    reset();
    TestSaga.throwOnInvocation = 2;
    TestSaga.throwOnCompensation = 1;
    await this.run();
    expect(this.error).toBeInstanceOf(SagaCompensationError);
    expect((this.error as SagaCompensationError).step).toBe('named');
  }

  @test
  async 'compensation: unnamed step + class method'() {
    reset();
    TestSaga.throwOnResult = true;
    TestSaga.throwOnCompensation = 2;
    await this.run();
    expect(this.error).toBeInstanceOf(SagaCompensationError);
    expect((this.error as SagaCompensationError).step).toBe(
      TestSaga.prototype.classMethodCompensate.name,
    );
  }
}
