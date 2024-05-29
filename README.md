# `workerpool` - Simple, type-safe, performant worker pool.

A simple, type-safe, performant and dependency free worker pool library.

## Usage

In `main.js`:

```js
import { WebWorkerFactory, WorkerPool } from "jsr:@negrel/workerpool";

// Create a worker pool that will execute worker_script.js using up to 8 Web
// Worker.
// With the given configuration, at most 800 (8 * 100) tasks can run concurrently.
const pool = new WorkerPool({
  workerFactory: new WebWorkerFactory(
    new URL("./worker_script.js", import.meta.url),
  ),
  minWorker: 0,
  maxWorker: 8,
  maxTasksPerWorker: 100,
});

const rpcs = [];

// Create 1000 tasks.
for (let i = 0; i < 1000; i++) {
  rpcs.push(pool.remoteProcedureCall({
    name: "doExtensiveWork",
    args: { i },
  }));
}

// Wait for all tasks to complete.
await Promise.all(rpcs);

// Print returned values.
console.log(rpcs);

// Terminate workers.
pool.terminate();
```

In `worker_script.js`:

```js
import { workerProcedureHandler } from "jsr:@negrel/workerpool";

let workerId = null;

self.onmessage = workerProcedureHandler(
  {
    // Called by worker pool (optional).
    setupWorker(wId) {
      workerId = wId;
    },
    doExtensiveWork(...args) {
      console.log(workerId, ...args);
      // Do work...
      return Math.random();
    },
  },
);
```

## Contributing

If you want to contribute to `workerpool` to add a feature or improve the code
contact me at [alexandre@negrel.dev](mailto:alexandre@negrel.dev), open an
[issue](https://github.com/negrel/workerpool/issues) or make a
[pull request](https://github.com/negrel/workerpool/pulls).

## :stars: Show your support

Please give a :star: if this project helped you!

[![buy me a coffee](.github/images/bmc-button.png)](https://www.buymeacoffee.com/negrel)

## :scroll: License

MIT © [Alexandre Negrel](https://www.negrel.dev/)
