import bcrypt from "bcryptjs";

import { type Result, err, ok } from "#shared/core/result";
import { WeakPasswordError } from "#users/domain/errors/user.errors";

const SALT_ROUNDS = 10;
const MIN_LENGTH = 12;

export class Password {
  private constructor(private readonly _hash: string) {}

  get value(): string {
    return this._hash;
  }

  static async create(raw: string): Promise<Result<Password, WeakPasswordError>> {
    if (raw.length < MIN_LENGTH) {
      return err(new WeakPasswordError());
    }
    const hash = await bcrypt.hash(raw, SALT_ROUNDS);
    return ok(new Password(hash));
  }

  static fromHash(hash: string): Password {
    return new Password(hash);
  }
}
