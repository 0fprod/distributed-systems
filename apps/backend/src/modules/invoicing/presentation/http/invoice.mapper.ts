import type { InvoiceDTO } from "@distributed-systems/shared";

import type { BackendInvoice } from "#invoicing/domain/invoice";

// Presentation mapper: serialises a domain entity to a public DTO for HTTP responses.
// Converts Guid → string explicitly via .value instead of relying on implicit toString().
// This makes the serialisation boundary visible and prevents Guid objects from leaking
// into JSON responses if Elysia's auto-serialisation behaviour ever changes.
export function toInvoiceDTO(invoice: BackendInvoice): InvoiceDTO {
  return {
    id: invoice.id.value,
    userId: invoice.userId.value,
    name: invoice.name,
    amount: invoice.amount,
    status: invoice.status,
  };
}
