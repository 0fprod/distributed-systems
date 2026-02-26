import type { Invoice, InvoiceStatus } from "@distributed-systems/shared";

import type { Invoice as PrismaInvoice } from "../generated/client";

// Anti-corruption layer: translates the Prisma-generated type (infrastructure)
// into the domain Invoice interface (defined in @distributed-systems/shared).
// The domain model is the canonical contract — Prisma is just a persistence detail.
export function toDomainInvoice(raw: PrismaInvoice): Invoice {
  return {
    id: raw.id,
    // Preserve the owner identity so the domain can enforce ownership rules.
    userId: raw.userId,
    name: raw.name,
    // Prisma stores amount as Float; domain uses number — compatible.
    amount: raw.amount,
    // Prisma stores status as String; we narrow to the domain union here.
    // If an unexpected value arrives from DB it will be caught at runtime.
    status: raw.status as InvoiceStatus,
  };
}

export function toDomainInvoices(raws: PrismaInvoice[]): Invoice[] {
  return raws.map(toDomainInvoice);
}
