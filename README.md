# `workerpool` - Simple, type-safe, performant worker pool.

A simple, type-safe, performant and dependency free worker pool library.

## Usage

In `main.ts`:

```ts
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
```

In `worker_script.ts`:

```js
import { workerMessageHandler } from "jsr:@negrel/workerpool";

declare const self: Worker;

self.onmessage = workerMessageHandler(
  {
    doExtensiveWork(...args) {
      console.log(...args);
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
