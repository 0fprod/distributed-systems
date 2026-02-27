import type { Invoice as PrismaInvoice } from "@distributed-systems/database";
import { Guid } from "@distributed-systems/shared";

import { BackendInvoice } from "#invoicing/domain/invoice";

export function toBackendInvoice(raw: PrismaInvoice): BackendInvoice {
  return BackendInvoice.create({
    id: Guid.fromString(raw.id),
    userId: Guid.fromString(raw.userId),
    name: raw.name,
    amount: raw.amount,
    status: raw.status as BackendInvoice["status"],
  });
}
