// Test data builder for Invoice records.
// Uses the fluent builder pattern so tests can express exactly what matters
// for a given scenario and leave all other fields at sensible defaults.
//
// Accepts a PrismaClient instance rather than using the shared singleton so
// that integration tests can inject a client pointing at a test container.
//
// Usage:
//   const invoice = await givenAnInvoice(prisma).forUser(userId).withAmount(100).withStatus(InvoiceStatus.FAILED).save();
//   const draft   = givenAnInvoice(prisma).forUser(userId).withName("Draft").build(); // no DB write
import type { PrismaClient } from "@distributed-systems/database";
import { toDomainInvoice } from "@distributed-systems/database";
import type { Invoice, InvoiceStatus as InvoiceStatusType } from "@distributed-systems/shared";
import { InvoiceStatus } from "@distributed-systems/shared";

// Internal shape used to accumulate builder state before persisting.
// userId is kept here (even though it is absent from the domain Invoice)
// because it is required as a FK when inserting the row.
interface InvoiceData {
  name: string;
  amount: number;
  status: InvoiceStatusType;
  userId: number;
}

class InvoiceBuilder {
  private readonly prisma: PrismaClient;

  private data: InvoiceData = {
    name: "Test Invoice",
    amount: 250.0,
    status: InvoiceStatus.PENDING,
    // Default userId of 0 is intentionally invalid — tests must call forUser()
    // or create a user row first so the FK constraint is satisfied.
    userId: 0,
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /** Associates the invoice with the given user id. */
  forUser(userId: number): this {
    this.data = { ...this.data, userId };
    return this;
  }

  withName(name: string): this {
    this.data = { ...this.data, name };
    return this;
  }

  withAmount(amount: number): this {
    this.data = { ...this.data, amount };
    return this;
  }

  withStatus(status: InvoiceStatusType): this {
    this.data = { ...this.data, status };
    return this;
  }

  /** Returns the unsaved data object — useful for assertions without DB round-trips. */
  build(): InvoiceData {
    return { ...this.data };
  }

  /** Persists the invoice to the database and returns the domain Invoice. */
  async save(): Promise<Invoice> {
    if (this.data.userId === 0) {
      throw new Error("InvoiceBuilder: userId is required. Call .forUser(userId) before .save().");
    }
    const created = await this.prisma.invoice.create({
      data: {
        name: this.data.name,
        amount: this.data.amount,
        status: this.data.status,
        userId: this.data.userId,
      },
    });

    return toDomainInvoice(created);
  }
}

/** Entry point for the fluent builder — mirrors the naming convention used in the domain. */
export function givenAnInvoice(prisma: PrismaClient): InvoiceBuilder {
  return new InvoiceBuilder(prisma);
}
