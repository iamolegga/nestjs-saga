import { suite, test } from '@testdeck/jest';

import { Builder, Saga } from '../src';

import { Base } from './base';

class TestCmd {}
class TestCmdResult {}

@Saga(TestCmd)
class TestSaga {
  saga = new Builder<TestCmd, TestCmdResult>()
    .step()
    .invoke(() => void 0)
    .return(this.buildResult)
    .build();

  buildResult(cmd: TestCmd): TestCmdResult {
    expect(cmd).toBeInstanceOf(TestCmd);
    expect(this).toBeInstanceOf(TestSaga);
    return new TestCmdResult();
  }
}

@suite
export class Return extends Base {
  cmd = new TestCmd();
  params = { sagas: [TestSaga] };

  @test
  async work() {
    await this.run();

    expect(this.result).toBeInstanceOf(TestCmdResult);
  }
}
