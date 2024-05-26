import { assert, assertEquals, assertMatch } from "./dev_deps.ts";
import { WebWorker } from "./web_worker.ts";

Deno.test("RPC double()", async () => {
  const worker = new WebWorker(
    new URL("./test_workers/double.ts", import.meta.url).href,
    { type: "module" },
  );

  const result = await worker.remoteProcedureCall<number, number>({
    name: "double",
    args: 2,
  });

  assertEquals(result, 4);

  worker.terminate();
});

Deno.test("error is thrown from worker", async () => {
  const worker = new WebWorker(
    new URL("./test_workers/error.ts", import.meta.url).href,
    { type: "module" },
  );

  try {
    await worker.remoteProcedureCall<undefined, number>({
      name: "error",
      args: undefined,
    });
  } catch (err) {
    assert(err.startsWith("Error: runtime error from worker"));
  }

  worker.terminate();
});

Deno.test("non existent procedure", async () => {
  const worker = new WebWorker(
    new URL("./test_workers/error.ts", import.meta.url).href,
    { type: "module" },
  );

  try {
    await worker.remoteProcedureCall<[], number>({
      name: "non existent",
      args: [],
    });
  } catch (err) {
    assert(err.startsWith('Error: procedure "non existent" doesn\'t exist'));
  }

  worker.terminate();
});

Deno.test("timeout error is thrown if worker doesn't respond", async () => {
  const worker = new WebWorker(
    new URL("./test_workers/timeout.ts", import.meta.url).href,
    { type: "module" },
  );

  try {
    await worker.remoteProcedureCall<number, number>(
      {
        name: "sleep",
        args: 10000, // 10s
      },
      { timeout: 1000 },
    ); // 1s
  } catch (err) {
    assertMatch(err, /^rpc \d+ \(sleep\) timed out/);
  }

  worker.terminate();
});
