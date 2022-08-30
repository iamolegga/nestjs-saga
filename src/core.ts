export class SagaInvocationError extends Error {
  constructor(readonly originalError: Error, readonly step: string) {
    super(originalError.message);
    Object.setPrototypeOf(this, SagaInvocationError.prototype);
    this.stack = originalError.stack;
  }
}

export class SagaCompensationError extends Error {
  constructor(readonly originalError: Error, readonly step: string) {
    super(originalError.message);
    Object.setPrototypeOf(this, SagaCompensationError.prototype);
    this.stack = originalError.stack;
  }
}

export type Fn<I, O = void> = (input: I) => Promise<O> | O;

class Step<T> {
  compensation?: Fn<T>;

  constructor(readonly name: string, public invocation: Fn<T>) {}

  async invoke(params: T): Promise<void> {
    return this.invocation(params);
  }

  async compensate(params: T): Promise<void> {
    if (this.compensation) return this.compensation(params);
  }

  bind(ctx: unknown): this {
    this.invocation = this.invocation.bind(ctx);
    if (this.compensation) this.compensation = this.compensation.bind(ctx);
    return this;
  }
}

class SagaFlow<T, R> {
  private readonly compensationSteps: Step<T>[] = [];
  private __current!: Step<T>;

  constructor(
    private readonly steps: Step<T>[],
    private readonly returnFn: Fn<T, R>,
  ) {}

  get current(): Step<T> {
    return this.__current;
  }

  async invoke(params: T): Promise<R> {
    for (const step of this.steps) {
      this.__current = step;
      await step.invoke(params);
      this.compensationSteps.push(step);
    }
    return this.returnFn(params);
  }

  async compensate(params: T): Promise<void> {
    for (const step of this.compensationSteps.reverse()) {
      this.__current = step;
      await step.compensate(params);
    }
  }

  bind(ctx: unknown): this {
    this.steps.forEach((step) => step.bind(ctx));
    return this;
  }
}

export enum SagaStatus {
  New = 'New',
  InProgress = 'In progress',
  InCompensation = 'In compensation',
  Complete = 'Complete',
  CompensationComplete = 'Compensation complete',
  CompensationError = 'Compensation error',
}

export class Saga<T, R> {
  private __status = SagaStatus.New;

  constructor(private sagaFlow: SagaFlow<T, R>) {}

  get status(): SagaStatus {
    return this.__status;
  }

  async execute(params: T): Promise<R> {
    this.__status = SagaStatus.InProgress;
    try {
      const result = await this.sagaFlow.invoke(params);
      this.__status = SagaStatus.Complete;
      return result;
    } catch (e) {
      this.__status = SagaStatus.InCompensation;
      await this.runCompensationFlow(params);
      throw new SagaInvocationError(
        wrapIfNotError(e),
        this.sagaFlow.current.name,
      );
    }
  }

  bind(ctx: unknown): this {
    this.sagaFlow.bind(ctx);
    return this;
  }

  private async runCompensationFlow(params: T): Promise<void> {
    try {
      await this.sagaFlow.compensate(params);
      this.__status = SagaStatus.CompensationComplete;
    } catch (e) {
      this.__status = SagaStatus.CompensationError;
      throw new SagaCompensationError(
        wrapIfNotError(e),
        this.sagaFlow.current.name,
      );
    }
  }
}

function wrapIfNotError(x: unknown): Error {
  if (!(x instanceof Error)) {
    return new Error(String(x));
  }
  return x;
}

type Cond<IF, THEN, ELSE> = IF extends void ? ELSE : THEN;

type BuilderMethodStepResult<T, R> = {
  invoke: (method: Fn<T>) => NextOptions<T, R> & {
    withCompensation: (method: Fn<T>) => NextOptions<T, R>;
  };
};

type BuilderMethodReturnResult<T, R> = { build: () => Saga<T, R> };

type NextOptions<T, R> = {
  step: (name?: string) => BuilderMethodStepResult<T, R>;
} & Cond<
  R,
  { return: (method: Fn<T, R>) => BuilderMethodReturnResult<T, R> },
  { build: () => Saga<T, R> }
>;

export class SagaBuilder<T, R = void> {
  private steps: Step<T>[] = [];
  private returnFn: Fn<T, R> = (() => void 0 as unknown) as Fn<T, R>;

  step(name = ''): BuilderMethodStepResult<T, R> {
    return {
      invoke: (
        method: Fn<T>,
      ): NextOptions<T, R> & {
        withCompensation: (method: Fn<T>) => NextOptions<T, R>;
      } => {
        const step = new Step(
          name || method.name || `step${this.steps.length}`,
          method,
        );
        this.steps.push(step);

        const nextOptions = {
          step: (name = '') => this.step(name),
          return: (method: Fn<T, R>) => this.return(method),
          build: () => this.build(),
        } as NextOptions<T, R>;

        return {
          ...nextOptions,
          withCompensation: (method: Fn<T>) => {
            step.compensation = method;
            return nextOptions;
          },
        } as NextOptions<T, R> & {
          withCompensation: (method: Fn<T>) => NextOptions<T, R>;
        };
      },
    };
  }

  private return(method: Fn<T, R>): BuilderMethodReturnResult<T, R> {
    this.returnFn = method;
    return { build: () => this.build() };
  }

  private build(): Saga<T, R> {
    return new Saga<T, R>(new SagaFlow<T, R>(this.steps, this.returnFn));
  }
}
