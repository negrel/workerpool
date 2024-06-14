import { RpcClient, WorkerRpcClient } from "./deps.ts";

/**
 * WorkerFactory define a factory of RpcWorker.
 */
export interface RpcClientFactory {
  createWorker(): RpcClient;
  terminateWorker(_: RpcClient): void;
}

/**
 * workerRpcClientFactory is an helper function to create an RpcClientFactory
 * that returns WorkerRpcClient.
 */
export function workerRpcClientFactory(
  specifier: string | URL,
  options?: WorkerOptions | undefined,
): RpcClientFactory {
  return {
    createWorker() {
      return new WorkerRpcClient(specifier, options);
    },
    terminateWorker(client: RpcClient) {
      if (client instanceof WorkerRpcClient) client.terminate();
    },
  };
}
