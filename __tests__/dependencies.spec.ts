import { Injectable, Module } from '@nestjs/common';
import { suite, test } from '@testdeck/jest';

import { Builder, Saga } from '../src';

import { Base } from './base';

@Injectable()
class Foo {
  foo() {}
}

@Injectable()
class Bar {
  bar() {}
}

@Module({
  providers: [Bar],
  exports: [Bar],
})
class BarModule {}

class TestCmd {}

@Saga(TestCmd)
class TestSaga {
  saga = new Builder<TestCmd>().step('1').invoke(this.step1).build();

  constructor(
    private foo: Foo,
    private bar: Bar,
  ) {}

  step1(_: TestCmd) {
    this.foo.foo();
    this.bar.bar();
  }
}

@suite
export class Dependencies extends Base {
  cmd = new TestCmd();
  params = {
    sagas: [TestSaga],
    imports: [BarModule],
    providers: [Foo],
  };

  @test
  async work() {
    const foo = jest.spyOn(Foo.prototype, 'foo');
    const bar = jest.spyOn(Bar.prototype, 'bar');

    await this.run();

    expect(foo).toHaveBeenCalledTimes(1);
    expect(bar).toHaveBeenCalledTimes(1);
  }
}
