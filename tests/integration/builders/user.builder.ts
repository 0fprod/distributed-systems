// Test data builder for User records.
// Uses the fluent builder pattern so tests can express exactly what matters
// for a given scenario and leave all other fields at sensible defaults.
//
// Accepts a PrismaClient instance rather than using the shared singleton so
// that integration tests can inject a client pointing at a test container.
//
// Usage:
//   const user = await givenAUser(prisma).withEmail("john@example.com").withPasswordHash("secret123").save();
//   const draft = givenAUser(prisma).withName("John Doe").build(); // no DB write
import type { PrismaClient } from "@distributed-systems/database";
import { toDomainUser } from "@distributed-systems/database";
import type { User } from "@distributed-systems/shared";

// UserData matches the domain User interface from shared package, minus the id
// (which is assigned by the database on insert).
type UserData = Omit<User, "id">;

class UserBuilder {
  private readonly prisma: PrismaClient;

  private data: UserData = {
    name: "Test User",
    email: "test@example.com",
    passwordHash: "hashedpassword123",
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  withName(name: string): this {
    this.data = { ...this.data, name };
    return this;
  }

  withEmail(email: string): this {
    this.data = { ...this.data, email };
    return this;
  }

  withPasswordHash(passwordHash: string): this {
    this.data = { ...this.data, passwordHash };
    return this;
  }

  /** Returns the unsaved data object — useful for assertions without DB round-trips. */
  build(): UserData {
    return { ...this.data };
  }

  /** Persists the user to the database and returns the domain User. */
  async save(): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        name: this.data.name,
        email: this.data.email,
        // Map domain field passwordHash → Prisma field password
        password: this.data.passwordHash,
      },
    });

    return toDomainUser(created);
  }
}

/** Entry point for the fluent builder — mirrors the naming convention used in the domain. */
export function givenAUser(prisma: PrismaClient): UserBuilder {
  return new UserBuilder(prisma);
}
