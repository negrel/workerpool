/**
 * Rpc define a Remote Procedure Call (RPC).
 */
export interface Rpc<A> {
  id: number;
  name: string;
  args: A;
}

/**
 * RpcOptions define options of a RPC.
 */
export interface RpcOptions {
  timeout: number;
  transfer: Transferable[];
}

/**
 * RpcWorker define interface common to all workers supporting Remote Procedure
 * Call (RPC).
 */
export interface RpcWorker {
  remoteProcedureCall<A, R>(
    _: { name: string; args: A },
    options?: Partial<RpcOptions>,
  ): Promise<R>;
}
