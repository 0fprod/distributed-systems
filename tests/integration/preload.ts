import { startStack } from "./setup";

try {
  const stack = await startStack();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__STACK__ = stack;

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
