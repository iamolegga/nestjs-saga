import { Builder, Saga } from '../src';

import { Base, useSuite } from './base';

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

class Return extends Base {
  cmd = new TestCmd();
  params = { sagas: [TestSaga] };
}

describe('Return', () => {
  const getSuite = useSuite(() => new Return());

  it('work', async () => {
    const suite = getSuite();
    await suite.run();

    expect(suite.result).toBeInstanceOf(TestCmdResult);
  });
});
