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
