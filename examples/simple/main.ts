import {
  minMaxWorker,
  WorkerPool,
  workerRpcClientFactory,
} from "jsr:@negrel/workerpool";

// Create a worker pool that will execute worker_script.js using up to 8 Worker.
// With the given configuration, at most 800 (8 * 100) tasks can run concurrently.
const pool = new WorkerPool({
  workerFactory: workerRpcClientFactory(
    new URL("./worker_script.ts", import.meta.url),
    { type: "module" },
  ),
  algo: minMaxWorker({
    maxWorker: 8,
    tasksPerWorker: {
      min: 0,
      max: 100,
    },
  }),
});

const rpcs: Promise<number>[] = [];

// Create 1000 tasks.
for (let i = 0; i < 1000; i++) {
  rpcs.push(pool.remoteProcedureCall<number, number>({
    name: "doExtensiveWork",
    args: i,
  }));
}

// Wait for all tasks to complete.
await Promise.all(rpcs);

// Print returned values.
console.log(rpcs);

// Terminate workers.
pool.terminate();
