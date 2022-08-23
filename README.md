# nestjs-saga

<p align="center">
  <a href="https://www.npmjs.com/package/nestjs-saga">
    <img alt="npm" src="https://img.shields.io/npm/v/nestjs-saga" />
  </a>
  <a href="https://github.com/iamolegga/nestjs-saga/actions">
    <img alt="GitHub branch checks state" src="https://badgen.net/github/checks/iamolegga/nestjs-saga">
  </a>
  <a href="https://codeclimate.com/github/iamolegga/nestjs-saga/test_coverage">
    <img src="https://api.codeclimate.com/v1/badges/6dccfddb7042674eb005/test_coverage" />
  </a>
  <a href="https://snyk.io/test/github/iamolegga/nestjs-saga">
    <img alt="Snyk Vulnerabilities for npm package" src="https://img.shields.io/snyk/vulnerabilities/npm/nestjs-saga" />
  </a>
  <a href="https://libraries.io/npm/nestjs-saga">
    <img alt="Libraries.io" src="https://img.shields.io/librariesio/release/npm/nestjs-saga">
  </a>
  <img alt="Dependabot" src="https://badgen.net/github/dependabot/iamolegga/nestjs-saga">
</p>

Basic implementation of saga pattern for NestJS (do not confuse it with the [built-in sagas](https://docs.nestjs.com/recipes/cqrs#sagas)).

This module is not too much related to [microservices sagas](https://microservices.io/patterns/data/saga.html) but could be used as a base to implement it.

Highly inspired by [node-sagas](https://github.com/SlavaPanevskiy/node-sagas) but rewritten a bit for more convenient usage with NestJS.

## installation

```sh
npm i nestjs-saga @nestjs/cqrs
```

## usage

### define

```ts
import { Builder, Saga } from 'nestjs-saga';

class FooSagaCommand {
  constructor(
    public bar: string,
    public baz: number,
  ) {}
}

class FooSagaResult {
  // ...
}

@Saga(FooSagaCommand)
class FooSaga {
  // Define `saga` field using Builder<FooSagaCommand> or if you want to return
  // some value use: Builder<FooSagaCommand, FooSagaResult>
  saga = new Builder<FooSagaCommand>()

    // Add step with the name, invocation and compensation functions
    .step('do something')
    .invoke(this.step1)
    .withCompensation(this.step1Compensation)

    // Add another one, name and compensation could be omitted
    .step()
    .invoke(this.step2)

    // If builder with result type is used (Builder<Command, Result>) then it's
    // required to add last `return` step, final `build` step will be available
    // only after this one. If no result type provided in Builder then this
    // method won't be available in types and saga will return `undefined`
    .return(this.buildResult)

    // After all steps `build` should be called
    .build();

  // Each invocation and compensation methods are called with the command as an
  // argument
  step1(cmd: FooSagaCommand) {

    // Each time saga is called as a new instance, so it's safe to save it's
    // state in own fields
    this.step1Result = 42;
  }

  // If step throws error the compensation chain is started in a reverse order:
  // step1 -> step2 -> step3(X) -> compensation2 -> compensation1
  step2(cmd: FooSagaCommand) {
    if (this.step1Result != 42) throw new Error('oh no!');
  }

  // After all compensations are done `SagaInvocationError` is thrown. It will
  // wrap the original error and it can be accessed by the `originalError` field
  step1Compensation(cmd: FooSagaCommand) {

    // If one of compensations throws error the compensations chain is stopped
    // and `SagaCompensationError` is thrown. It will wrap the original error
    // and it can be accessed by the `originalError` field
    if (this.step1Result != 42) throw new Error('oh no!');
  }

  // if saga should return some result pass it's type to the Builder generic and
  // use `return` method in the build chain with the callback that returns this
  // class or type
  buildResult(cmd: FooSagaCommand): Result | Promise<Result> {
    return new Result();
  }
}
```

### register

```ts
import { CqrsModule } from '@nestjs/cqrs';
import { SagaModule } from 'nestjs-saga';

@Module({
  imports: [
    CqrsModule,
    SagaModule.register({
      imports: [...], // optional
      providers: [...], // optional
      sagas: [FooSaga, BarSaga, BazSaga], // required
    }),
  ],
})
class AppModule {}
```

### run

```ts
import { CommandBus } from '@nestjs/cqrs';
import { SagaInvocationError, SagaCompensationError } from 'nestjs-saga';

class AnyServiceOrController {
  constructor(private commandBus: CommandBus) {}

  someMethod() {
    try {
      // If saga defined with the result type, then result will be passed,
      // otherwise it's `undefined`
      const result = await this.commandBus.execute(new FooSagaCommand(...args));

    } catch (e) {
      if (e instanceof SagaInvocationError) {
        // Saga failed but all compensations succeeded.
        e.originalError // could be used to get access to original error
        e.step // can be used to understand which step failed

      } else if (e instanceof SagaCompensationError) {
        // Saga failed but all compensations succeeded.
        e.originalError // could be used to get access to original error
        e.step // can be used to understand which step compensation failed
      }
    }
  }
}
```
