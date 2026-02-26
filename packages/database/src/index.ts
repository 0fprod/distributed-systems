// Public API barrel for @distributed-systems/database.
// Consumers (backend, worker) import everything they need from this single entry point.

export { prisma } from "./client";
export { PrismaClient } from "./generated/client";
export { toDomainInvoice, toDomainInvoices } from "./invoice/invoice.mapper";
export { toDomainUser } from "./user/user.mapper";
