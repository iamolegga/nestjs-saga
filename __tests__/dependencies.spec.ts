import { Injectable, Module } from '@nestjs/common';

import { Builder, Saga } from '../src';

import { Base, useSuite } from './base';

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

class Dependencies extends Base {
  cmd = new TestCmd();
  params = {
    sagas: [TestSaga],
    imports: [BarModule],
    providers: [Foo],
  };
}

describe('Dependencies', () => {
  const getSuite = useSuite(() => new Dependencies());

  it('work', async () => {
    const suite = getSuite();
    const foo = vi.spyOn(Foo.prototype, 'foo');
    const bar = vi.spyOn(Bar.prototype, 'bar');

    await suite.run();

    expect(foo).toHaveBeenCalledTimes(1);
    expect(bar).toHaveBeenCalledTimes(1);
  });
});
