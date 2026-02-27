// Public API barrel for @distributed-systems/database.
// Consumers (backend, worker) import everything they need from this single entry point.

export { prisma } from "./client";
export { PrismaClient } from "./generated/client";
// Re-export Prisma model types so bounded-context infrastructure mappers can type their
// raw Prisma rows without reaching into the generated client internals directly.
export type { Invoice, User } from "./generated/client";
export { toInvoiceDTO, toInvoiceDTOs } from "./invoice/invoice.mapper";
export { toPrismaUserFields } from "./user/user.mapper";
