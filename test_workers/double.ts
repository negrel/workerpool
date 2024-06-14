import { workerMessageHandler } from "../deps.ts";

declare const self: Worker;

self.onmessage = workerMessageHandler(
  {
    double(nb: number): number {
      return nb * 2;
    },
  },
);
