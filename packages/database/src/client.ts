import { PrismaClient } from "./generated/client";

// Singleton Prisma client shared across the process lifetime.
// Both the backend and worker create one instance each via this export —
// they run as separate processes, so there is no shared-memory concern.
const prisma = new PrismaClient();

export { prisma };
