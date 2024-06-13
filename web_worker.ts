import { RpcOptions, RpcWorker } from "./rpc.ts";
import { RpcWorkerFactory } from "./worker_pool.ts";

type RpcResult<R> =
  | {
    id: number;
    result: R;
  }
  | {
    id: number;
    error: string;
  };

type ResponseHandler<T> = (_: RpcResult<T>) => void;

const defaultRpcOptions: RpcOptions = {
  timeout: 300000,
  transfer: [],
};

let globalMsgId = 0;

/**
 * WebWorker define an RpcWorker based on Web Worker API.
 */
export class WebWorker implements RpcWorker {
  private readonly worker: Worker;
  // deno-lint-ignore no-explicit-any
  private readonly responseHandlers = new Map<number, ResponseHandler<any>>();

  constructor(specifier: string | URL, options?: WorkerOptions) {
    this.worker = new Worker(specifier, options);
    this.worker.onmessage = this.onResponse.bind(this);
    this.worker.onmessageerror = (ev) => {
      console.error(ev);
    };
    this.worker.onerror = (ev) => {
      throw new Error(ev.message);
    };
  }

  terminate(): void {
    this.worker.terminate();
  }

  private onResponse<R>(event: MessageEvent<RpcResult<R>>): void {
    const responseId = event.data.id;
    const responseHandler = this.responseHandlers.get(responseId);

    if (responseHandler === undefined) {
      throw new Error(
        `received unexpected response for rpc ${responseId}, no handler registered`,
      );
    }

    responseHandler(event.data);
  }

  async remoteProcedureCall<A, R>(
    rpc: { name: string; args: A },
    options: Partial<RpcOptions> = {},
  ): Promise<R> {
    const { timeout, transfer } = {
      ...defaultRpcOptions,
      ...options,
    };

    const msgId = globalMsgId++;

    return await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(`rpc ${msgId} (${rpc.name}) timed out`);
      }, timeout);

      this.addResponseHandler(msgId, (data: RpcResult<R>) => {
        // Clear timeout and response handler.
        clearTimeout(timeoutId);
        this.removeResponseHandler(msgId);

        if ("error" in data) {
          reject(data.error);
          return;
        }

        resolve(data.result);
      });

      this.worker.postMessage({ id: msgId, ...rpc }, transfer);
    });
  }

  // deno-lint-ignore no-explicit-any
  private addResponseHandler(id: number, handler: ResponseHandler<any>): void {
    this.responseHandlers.set(id, handler);
  }

  private removeResponseHandler(id: number): void {
    this.responseHandlers.delete(id);
  }
}

/**
 * WebWorkerFactory is an RpcWorkerFactory that produce and destroy WebWorker.
 */
export class WebWorkerFactory implements RpcWorkerFactory {
  private readonly moduleUrl: URL;
  private readonly options?: WorkerOptions;

  constructor(moduleUrl: URL, options?: WorkerOptions) {
    this.moduleUrl = moduleUrl;
    this.options = options;
  }

  createWorker(): RpcWorker {
    return new WebWorker(this.moduleUrl, this.options);
  }

  terminateWorker(rpcWorker: RpcWorker) {
    if (rpcWorker instanceof WebWorker) {
      rpcWorker.terminate();
    }
  }
}
