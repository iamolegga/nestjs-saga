/* eslint-disable @typescript-eslint/ban-ts-comment */
import { SagaBuilder } from '../src/core';

// check saga with single step
new SagaBuilder<number>()
  .step()
  .invoke((_: number) => void 0)
  .build();

// check argument type
new SagaBuilder<number>()
  .step()
  // @ts-expect-error
  .invoke((_: string) => void 0)
  .build();

// check that cannot build without called return method when not void
new SagaBuilder<number, boolean>()
  .step()
  .invoke((_: number) => void 0)
  // @ts-expect-error
  .build();

// check compensation
new SagaBuilder<number>()
  .step()
  .invoke((_: number) => void 0)
  .withCompensation((_: number) => void 0)
  .build();

// check two steps
new SagaBuilder<number>()
  .step()
  .invoke((_: number) => void 0)
  .step()
  .invoke((_: number) => void 0)
  .build();

// check that cannot use return method withoud declaring return type
new SagaBuilder<number>()
  .step()
  .invoke((_: number) => void 0)
  .withCompensation((_: number) => void 0)
  // @ts-expect-error
  .return(x)
  .build();

// check normal usage when return type is declared
new SagaBuilder<number, boolean>()
  .step()
  .invoke((_: number) => void 0)
  .withCompensation((_: number) => void 0)
  .return(() => true)
  .build();
