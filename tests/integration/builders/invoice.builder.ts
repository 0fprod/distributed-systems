// Test data builder for Invoice records.
// Uses the fluent builder pattern so tests can express exactly what matters
// for a given scenario and leave all other fields at sensible defaults.
//
// Accepts a PrismaClient instance rather than using the shared singleton so
// that integration tests can inject a client pointing at a test container.
//
// Usage:
//   const invoice = await givenAnInvoice(prisma).withAmount(100).withStatus("failed").save();
//   const draft   = givenAnInvoice(prisma).withName("Draft").build(); // no DB write
import type { PrismaClient } from "@distributed-systems/database";
import { InvoiceStatus } from "@distributed-systems/shared";

interface InvoiceData {
  name: string;
  amount: number;
  status: string;
}

interface PersistedInvoice extends InvoiceData {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

class InvoiceBuilder {
  private readonly prisma: PrismaClient;

  private data: InvoiceData = {
    name: "Test Invoice",
    amount: 250.0,
    status: InvoiceStatus.PENDING,
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  withName(name: string): this {
    this.data = { ...this.data, name };
    return this;
  }

  withAmount(amount: number): this {
    this.data = { ...this.data, amount };
    return this;
  }

  withStatus(status: string): this {
    this.data = { ...this.data, status };
    return this;
  }

  /** Returns the unsaved data object — useful for assertions without DB round-trips. */
  build(): InvoiceData {
    return { ...this.data };
  }

  /** Persists the invoice to the database and returns the full record. */
  async save(): Promise<PersistedInvoice> {
    return this.prisma.invoice.create({
      data: {
        name: this.data.name,
        amount: this.data.amount,
        status: this.data.status,
      },
    });
  }
}

/** Entry point for the fluent builder — mirrors the naming convention used in the domain. */
export function givenAnInvoice(prisma: PrismaClient): InvoiceBuilder {
  return new InvoiceBuilder(prisma);
}
