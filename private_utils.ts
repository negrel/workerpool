export function* runningTasksIterator(
  // deno-lint-ignore no-explicit-any
  runningTasks: Set<Promise<any>>[],
  // deno-lint-ignore no-explicit-any
): Generator<Promise<any>, void, unknown> {
  for (const set of runningTasks) {
    for (const v of set.values()) {
      yield v;
    }
  }
}
