/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {
  DynamicModule,
  Injectable,
  ModuleMetadata,
  Scope,
  Type,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CommandHandler, CqrsModule, ICommandHandler } from '@nestjs/cqrs';

import { Saga as SagaCore } from './core';

type WithSaga<T, S, R> = { saga: SagaCore<S, R> } & T;

const __SAGA_HANDLER__ = '__SAGA_HANDLER__';

export function Saga<S>(command: Type<S>) {
  return <X, T extends Type<WithSaga<X, S, unknown>>>(target: T): T => {
    target.prototype.execute = function execute(cmd: S) {
      return this.saga.execute(cmd);
    };
    Reflect.defineMetadata(__SAGA_HANDLER__, command, target);
    return Injectable({ scope: Scope.REQUEST })(target) as typeof target;
  };
}

export interface SagaModuleRegisterParams
  extends Pick<ModuleMetadata, 'imports' | 'providers'> {
  sagas: Type<WithSaga<any, any, any>>[];
}

export class SagaModule {
  static register(params: SagaModuleRegisterParams): DynamicModule {
    return {
      imports: [CqrsModule, ...(params.imports || [])],
      module: SagaModule,
      providers: [
        ...(params.providers || []),
        ...params.sagas.flatMap((saga) => {
          const cmdType: Type<any> = Reflect.getMetadata(
            __SAGA_HANDLER__,
            saga,
          );

          @CommandHandler(cmdType)
          class SagaCommandHandler {
            constructor(private moduleRef: ModuleRef) {}

            async execute(cmd: any) {
              const s: ICommandHandler & WithSaga<unknown, unknown, unknown> =
                await this.moduleRef.create(saga);
              s.saga.bind(s);
              return s.execute(cmd);
            }
          }

          Object.defineProperty(SagaCommandHandler, 'name', {
            writable: true,
            value: [cmdType.name, 'SagaDispatcher'].join(''),
          });

          return [saga, SagaCommandHandler];
        }),
      ],
    };
  }
}
