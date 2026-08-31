import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import request from 'supertest';

import { SagaModule, SagaModuleRegisterParams } from '../src';

import { getFreePort } from './get-free-port';

export abstract class Base {
  abstract cmd: any;
  abstract params: SagaModuleRegisterParams;

  protected app!: INestApplication;
  error?: any;
  result?: any;

  async before() {
    vi.restoreAllMocks();
    delete this.error;

    const cmd = this.cmd;

    const suite = this;

    @Controller('/')
    class TestController {
      constructor(private bus: CommandBus) {}
      @Get('/')
      async test() {
        try {
          suite.result = await this.bus.execute(cmd);
          return null;
        } catch (e) {
          suite.error = e;
        }
      }
    }

    @Module({
      imports: [CqrsModule, SagaModule.register(this.params)],
      controllers: [TestController],
    })
    class AppModule {}

    this.app = await NestFactory.create(AppModule, { logger: false });
    const port = await getFreePort();
    await this.app.listen(port);
  }

  async after() {
    await this.app.close();
  }

  async run() {
    return request(this.app.getHttpServer()).get('/');
  }
}

/**
 * Wires a `Base` subclass into vitest's lifecycle the way the `@testdeck`
 * `@suite` decorator used to: a fresh instance per test, `before` as
 * `beforeEach` and `after` as `afterEach`.
 */
export function useSuite<T extends Base>(factory: () => T): () => T {
  let instance: T;

  beforeEach(async () => {
    instance = factory();
    await instance.before();
  });

  afterEach(async () => {
    await instance.after();
  });

  return () => instance;
}
