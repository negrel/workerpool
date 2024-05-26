import { type RpcOptions, RpcWorker } from "./rpc.ts";

/**
 * WorkerFactory define a factory of RpcWorker.
 */
export interface RpcWorkerFactory {
  createWorker(): RpcWorker;
  terminateWorker(_: RpcWorker): void;
}

/**
 * WorkerPool options.
 */
export interface WorkerPoolOptions {
  workerFactory: RpcWorkerFactory;
  minWorker: number;
  maxWorker: number;
  maxTasksPerWorker: number;
}

/**
 * WorkerPool is a performant and extensible worker pool.
 */
export class WorkerPool {
  private readonly workers: RpcWorker[] = [];
  // deno-lint-ignore no-explicit-any
  private readonly runningTasks: Array<Set<Promise<any>>> = [];
  private readonly taskQueue: Array<
    // deno-lint-ignore no-explicit-any
    [(_: [RpcWorker, number]) => void, (_: any) => void]
  > = [];

  private readonly options: WorkerPoolOptions;

  constructor(options: WorkerPoolOptions) {
    this.options = options;
  }

  async remoteProcedureCall<A, R>(
    rpc: { name: string; args: A },
    options?: Partial<RpcOptions>,
  ): Promise<R> {
    let worker = this.workers[0];
    let workerIndex = 0;

    // Find a worker.
    if (this.workers.length < this.options.minWorker) {
      [worker, workerIndex] = this.createWorker();
    } else {
      let workerIndexWithLessTask = -1;
      let workerMinTask = Number.MAX_SAFE_INTEGER;
      for (let i = 0; i < this.workers.length; i++) {
        if (this.runningTasks[i].size < workerMinTask) {
          workerMinTask = this.runningTasks[i].size;
          workerIndexWithLessTask = i;
        }
      }

      // All workers are full
      if (workerMinTask >= this.options.maxTasksPerWorker) {
        if (this.workers.length < this.options.maxWorker) {
          [worker, workerIndex] = this.createWorker();
          this.runningTasks.push(new Set());
        } else {
          // Wait for a new worker to be free.
          [worker, workerIndex] = await new Promise((resolve, reject) => {
            this.taskQueue.push([resolve, reject]);
          });
        }
      } else {
        worker = this.workers[workerIndexWithLessTask];
        workerIndex = workerIndexWithLessTask;
      }
    }

    // Do RPC.
    const promise = worker.remoteProcedureCall<A, R>(rpc, options);
    this.runningTasks[workerIndex].add(promise);
    const result = await promise;
    this.runningTasks[workerIndex].delete(promise);

    // If task in queue, resume it.
    const startNextTask = this.taskQueue.shift();
    if (startNextTask !== undefined) {
      startNextTask[0]([worker, workerIndex]);
    }

    return result;
  }

  async forEachWorkerRemoteProcedureCall<A, R>(
    rpc: { name: string; args: A },
    options?: Partial<RpcOptions>,
  ): Promise<Array<PromiseSettledResult<Awaited<R>>>> {
    const promises = [];
    for (const w of this.workers) {
      promises.push(w.remoteProcedureCall<A, R>(rpc, options));
    }

    return await Promise.allSettled(promises);
  }

  // Reject task in waiting queue and terminate workers.
  terminate(): void {
    while (this.taskQueue.length > 0) {
      // Reject task in queue.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.taskQueue.pop()![1]("worker terminate");
    }

    for (const w of this.workers) {
      this.options.workerFactory.terminateWorker(w);
    }
  }

  private createWorker(): [RpcWorker, number] {
    const worker = this.options.workerFactory.createWorker();
    const index = this.workers.length;

    void worker.remoteProcedureCall({
      name: "setupWorker",
      args: this.workers.length,
    });

    this.runningTasks.push(new Set());
    this.workers.push(worker);

    return [worker, index];
  }
}
