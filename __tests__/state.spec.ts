import { suite, test } from '@testdeck/jest';

import { Builder, Saga } from '../src';

import { Base } from './base';

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

@suite
export class State extends Base {
  cmd = new TestCmd();
  params = { sagas: [TestSaga] };

  @test
  async 'instance created for each command sent'() {
    await this.run();
    await this.run();
  }
}
