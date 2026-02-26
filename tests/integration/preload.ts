import { afterAll } from "bun:test";

import { startStack } from "./setup";

try {
  const stack = await startStack();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__STACK__ = stack;

  // afterAll runs async after every test file completes — the correct place
  // to tear down the stack so child processes (backend, worker) release their
  // ports before the next test run.
  afterAll(async () => {
    await stack.teardown().catch(() => {});
  });

  process.on("SIGINT", async () => {
    await stack.teardown().catch(() => {});
    process.exit(130);
  });
  process.on("SIGTERM", async () => {
    await stack.teardown().catch(() => {});
    process.exit(143);
  });
} catch (e) {
  console.error("Preload failed to start integration stack:", e);
  process.exit(1);
}
