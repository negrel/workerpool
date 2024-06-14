import { RpcClient, RpcOptions } from "./deps.ts";
import { runningTasksIterator } from "./private_utils.ts";
import { RpcClientFactory } from "./rpc_client_factory.ts";

/**
 * Algo define core logic of worker pool.
 */
export type Algo = (state: WorkerPoolState) => number | null;

/**
 * WorkerPoolOptions holds options of a worker pool.
 * Worker selector selects and returns index of a worker to use for next RPC
 * based on the worker pool state. If it returns null, a new worker is created.
 */
export interface WorkerPoolOptions {
  workerFactory: RpcClientFactory;
  algo: Algo;
}

/**
 * WorkerPoolState holds state of a worker RPC client pool.
 */
export interface WorkerPoolState {
  // deno-lint-ignore no-explicit-any
  readonly runningTasks: Array<Set<Promise<any>>>;
  readonly workers: RpcClient[];
}

/**
 * WorkerPool is a performant and extensible worker pool.
 */
export class WorkerPool implements RpcClient {
  private readonly options: WorkerPoolOptions;
  private readonly state: WorkerPoolState = {
    runningTasks: [],
    workers: [],
  };

  constructor(options: WorkerPoolOptions) {
    this.options = {
      ...options,
    };
  }

  async remoteProcedureCall<A, R>(
    rpc: { name: string; args: A },
    options?: Partial<RpcOptions>,
  ): Promise<R> {
    let workerIndex = this.options.algo(this.state);
    if (workerIndex === null) workerIndex = this.createWorker();
    if (workerIndex === -1) {
      await Promise.race(runningTasksIterator(this.state.runningTasks));
      return this.remoteProcedureCall(rpc, options);
    }

    const worker = this.state.workers[workerIndex];

    const promise = worker.remoteProcedureCall<A, R>(rpc, options);
    this.state.runningTasks[workerIndex].add(promise);
    const result = await promise.finally(() => {
      this.state.runningTasks[workerIndex].delete(promise);
    });

    return result;
  }

  async forEachWorkerRemoteProcedureCall<A, R>(
    rpc: { name: string; args: A },
    options?: Partial<RpcOptions>,
  ): Promise<Array<PromiseSettledResult<Awaited<R>>>> {
    const promises = [];
    for (const w of this.state.workers) {
      promises.push(w.remoteProcedureCall<A, R>(rpc, options));
    }

    return await Promise.allSettled(promises);
  }

  // Reject task in waiting queue and terminate workers.
  async terminate(): Promise<void> {
    await Promise.all(
      this.state.workers.map((w) =>
        this.options.workerFactory.terminateWorker(w)
      ),
    );
  }

  private createWorker(): number {
    const worker = this.options.workerFactory.createWorker();
    const index = this.state.workers.length;

    this.state.runningTasks.push(new Set());
    this.state.workers.push(worker);

    return index;
  }
}
