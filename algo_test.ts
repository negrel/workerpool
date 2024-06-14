import { minMaxWorker } from "./algo.ts";
import { Rpc, RpcOptions } from "./deps.ts";
import { assertEquals } from "./dev_deps.ts";
import { runningTasksIterator } from "./private_utils.ts";
import { WorkerPoolState } from "./worker_pool.ts";

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

Deno.test("minMaxWorker enqueue in first worker", async () => {
  const state: WorkerPoolState = {
    runningTasks: [],
    workers: [],
  };

  const addTask = (i: number, promise: Promise<void>) => {
    state.runningTasks[i].add(promise);
    promise.finally(() => state.runningTasks[i].delete(promise));
  };

  const workerMock = {
    remoteProcedureCall<A, R>(_rpc: Rpc<A>, _options?: Partial<RpcOptions>): R {
      return null as unknown as R;
    },
  };

  const algo = minMaxWorker({
    maxWorker: 2,
    tasksPerWorker: {
      min: 2,
      max: 2,
    },
  });

  // Create initial worker.
  assertEquals(algo(state), null);

  // Create a worker.
  state.workers.push(workerMock);
  state.runningTasks.push(new Set());
  // Add mock task.
  addTask(0, sleep(1000));

  // Second tasks is on first worker.
  assertEquals(algo(state), 0);

  // Add mock task.
  addTask(0, sleep(1000));

  // Third tasks runs on a new worker.
  assertEquals(algo(state), null);

  // Create a worker.
  state.workers.push(workerMock);
  state.runningTasks.push(new Set());
  // Add mock task.
  addTask(1, sleep(1000));

  // Forth tasks is on second worker.
  assertEquals(algo(state), 1);

  // Add mock task.
  addTask(1, sleep(1000));

  // Fifth tasks must wait for the first sleep task to complete.
  assertEquals(algo(state), -1);
  assertEquals(algo(state), -1);

  // Wait for a task to complete.
  await Promise.race(runningTasksIterator(state.runningTasks));

  // First task of first worker should complete first.
  assertEquals(algo(state), 0);

  await Promise.all(runningTasksIterator(state.runningTasks));
});
