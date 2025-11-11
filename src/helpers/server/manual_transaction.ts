type RollbackHandler = () => Promise<void>;

export interface ManualTransactionStep<TDb, TResult> {
  description?: string;
  run: (db: TDb) => Promise<TResult>;
  rollback?: (db: TDb, result: TResult) => Promise<void>;
}

export interface ManualTransactionContext<TDb> {
  step<TResult>(step: ManualTransactionStep<TDb, TResult>): Promise<TResult>;
}

/**
 * Executes one or more DB mutations sequentially and rolls back the
 * previously completed steps if any subsequent step throws.
 *
 * This is a best-effort replacement for real SQL transactions when
 * running on storage providers (e.g. Cloudflare D1) where Drizzle
 * transactions are unavailable.
 *
 * Usage overview (no need to inspect the implementation):
 * - `runManualTransaction(db, executor)` takes your Drizzle/DB client and a callback.
 * - Inside the callback you receive `tx`, which exposes `tx.step({ run, rollback, description })`.
 *   - `run` (required): async function that performs a single mutation and returns any value.
 *   - `rollback` (optional but recommended): async function that receives the DB client plus the
 *     value returned by `run`. It should undo the mutation if later steps fail.
 *   - `description` (optional): human-readable label that will be logged if rollback fails.
 * - `tx.step` resolves with whatever `run` returns, so you can pass IDs/results to later steps.
 * - If every step succeeds, the transaction resolves with the callback’s return value.
 * - If any step throws, `runManualTransaction` calls every collected `rollback` handler in reverse order,
 *   then rethrows the original error.
 *
 * Important notes:
 * 1. This does not provide database-level isolation; concurrent writes can still interleave.
 * 2. Rollbacks are best-effort. Failures are logged and the original error is still thrown.
 * 3. Keep each step small and idempotent when possible to reduce rollback complexity.
 *
 * @example
 * ```ts
 * await runManualTransaction(db, async (tx) => {
 *   const commentId = await tx.step({
 *     description: "insert comment",
 *     run: async () => {
 *       const [inserted] = await db
 *         .insert(commentTable)
 *         .values({  ...  })
 *         .returning({ id: commentTable.id });
 *       if (!inserted?.id) throw new Error("Failed to insert comment");
 *       return inserted.id;
 *     },
 *     rollback: (_, insertedId) =>
 *       db.delete(commentTable).where(eq(commentTable.id, insertedId)),
 *   });
 *
 *   await tx.step({
 *     description: "log history",
 *     run: () =>
 *       db.insert(questHistoryTable).values({
 *         commentId,
 *          ...
 *       }),
 *   });
 * });
 * ```
 */
export async function runManualTransaction<TDb, TResult>(
  db: TDb,
  executor: (tx: ManualTransactionContext<TDb>) => Promise<TResult>,
) {
  // Stack of rollback handlers so we can unwind completed steps if later ones fail.
  const rollbackStack: { handler: RollbackHandler; description?: string }[] =
    [];

  const context: ManualTransactionContext<TDb> = {
    async step<TResult>({
      run,
      rollback,
      description,
    }: ManualTransactionStep<TDb, TResult>) {
      // Execute the caller-provided mutation.
      const result = await run(db);

      if (rollback) {
        // Store the rollback handler so we can reverse this step if needed.
        rollbackStack.push({
          description,
          handler: () => rollback(db, result),
        });
      }

      return result;
    },
  };

  try {
    // Execute all steps; let caller return whatever they need.
    const output = await executor(context);
    // No failures => no rollback required.
    rollbackStack.length = 0;
    return output;
  } catch (error) {
    // Unwind in reverse order, tolerating rollback failures but logging them.
    while (rollbackStack.length) {
      const rollback = rollbackStack.pop();
      if (!rollback) continue;

      const label = rollback.description ? ` (${rollback.description})` : "";
      try {
        await rollback.handler();
      } catch (rollbackError) {
        console.error(
          `Failed to rollback manual transaction step${label}`,
          rollbackError,
        );
      }
    }

    throw error;
  }
}
