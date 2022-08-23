/* eslint-disable @typescript-eslint/no-explicit-any */
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
  protected error?: any;
  protected result?: any;

  async before() {
    jest.restoreAllMocks();
    delete this.error;

    const cmd = this.cmd;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
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

    this.app = await NestFactory.create(AppModule);
    const port = await getFreePort();
    await this.app.listen(port);
  }

  async after() {
    await this.app.close();
  }

  protected async run() {
    return request(this.app.getHttpServer()).get('/');
  }
}
