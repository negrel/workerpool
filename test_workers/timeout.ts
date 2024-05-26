import { workerProcedureHandler } from "../worker.ts";

declare const self: Worker;

self.onmessage = workerProcedureHandler(
  {
    sleep(ms: number): Promise<void> {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    },
  },
);
