import { workerMessageHandler } from "../deps.ts";

declare const self: Worker;

self.onmessage = workerMessageHandler(
  {
    error() {
      throw new Error("runtime error from worker");
    },
  },
);
