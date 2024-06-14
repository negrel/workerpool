import { assert, assertEquals } from "./dev_deps.ts";
import { workerRpcClientFactory } from "./rpc_client_factory.ts";
import { WorkerPool } from "./worker_pool.ts";

Deno.test("always create worker", async () => {
  let algoCallCount = 0;
  const pool = new WorkerPool({
    workerFactory: workerRpcClientFactory(
      new URL("./test_workers/double.ts", import.meta.url),
      { type: "module" },
    ),
    algo: (state) => {
      assertEquals(algoCallCount, state.workers.length);
      assertEquals(algoCallCount, state.runningTasks.length);

      algoCallCount++;
      return null;
    },
  });

  for (let i = 0; i < 10; i++) {
    const result = await pool.remoteProcedureCall({ name: "double", args: i });
    assertEquals(result, i * 2);
  }

  assertEquals(algoCallCount, 10);
});

Deno.test("create single worker and reuse it", async () => {
  let algoCallCount = 0;
  const pool = new WorkerPool({
    workerFactory: workerRpcClientFactory(
      new URL("./test_workers/double.ts", import.meta.url),
      { type: "module" },
    ),
    algo: (state) => {
      algoCallCount++;
      if (state.workers.length === 0) return null;

      assertEquals(state.workers.length, algoCallCount === 1 ? 0 : 1);

      return 0;
    },
  });

  for (let i = 0; i < 10; i++) {
    const result = await pool.remoteProcedureCall({ name: "double", args: i });
    assertEquals(result, i * 2);
  }

  assertEquals(algoCallCount, 10);
});

Deno.test("timeout", async () => {
  const pool = new WorkerPool({
    workerFactory: workerRpcClientFactory(
      new URL("./test_workers/sleep.ts", import.meta.url),
      { type: "module" },
    ),
    algo: () => null,
  });

  await pool.remoteProcedureCall({ name: "sleep", args: 1000 }, {
    timeout: 100,
  }).then(() => assert(false))
    .catch((err) => assert(err.toString().includes("timed out")));

  await pool.terminate();
});

Deno.test("rpc return an error", async () => {
  const pool = new WorkerPool({
    workerFactory: workerRpcClientFactory(
      new URL("./test_workers/error.ts", import.meta.url),
      { type: "module" },
    ),
    algo: () => null,
  });

  await pool.remoteProcedureCall({ name: "error", args: null })
    .then(() => assert(false))
    .catch((err) =>
      assert(err.toString().includes("runtime error from worker"))
    );

  await pool.terminate();
});
