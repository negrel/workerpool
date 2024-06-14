import { Algo, WorkerPoolState } from "./worker_pool.ts";

/**
 * alwaysCreateWorker is an {@link Algo} that creates a new worker per RPC.
 */
export function alwaysCreateWorker(_state: WorkerPoolState): null {
  return null;
}

/**
 * minMaxWorker returns an {@link Algo} that executes as follow:
 * * Return null if pool is empty
 * * If a worker doesn't have tasksPerWorker.min tasks, return its index
 * * If number of worker is less than maxWorker, return null
 * * If a worker doesn't have tasksPerWorker.max tasks, return its index
 * * Wait for a running task to complete and call algo recursively
 */
export function minMaxWorker(
  { maxWorker, tasksPerWorker }: {
    maxWorker: number;
    tasksPerWorker: { min: number; max: number };
  },
): Algo {
  const algo = (state: WorkerPoolState): number | null => {
    // Create first worker.
    if (state.workers.length === 0) return null;

    const {
      minRunningTasks,
      workerIndexWithLessWork,
    } = findWorkerWithLessWork(state);

    // Can't create new worker until worker has at least tasksPerWorker.min tasks.
    if (minRunningTasks < tasksPerWorker.min) {
      return workerIndexWithLessWork;
    } else { // Each worker respect minimum quota of task.
      // Create a new one if possible.
      if (state.workers.length < maxWorker) return null;

      // Worker isn't full.
      if (minRunningTasks < tasksPerWorker.max) {
        return workerIndexWithLessWork;
      }

      // Workers are full and we can't create new worker.
      // Wait for worker to complete a task.
      return -1;
    }
  };

  return algo;
}

function findWorkerWithLessWork(
  state: WorkerPoolState,
): { minRunningTasks: number; workerIndexWithLessWork: number } {
  let minRunningTasks = Number.MAX_SAFE_INTEGER;
  let workerIndexWithLessWork = -1;
  // Find worker with less tasks
  for (let i = 0; i < state.workers.length; i++) {
    if (state.runningTasks[i].size < minRunningTasks) {
      minRunningTasks = state.runningTasks[i].size;
      workerIndexWithLessWork = i;
    }
  }

  return { minRunningTasks, workerIndexWithLessWork };
}
