import type { Result } from "#shared/core/result";

import type { UserWorkerPersistenceError } from "../errors/user.errors";
import type { WorkerUser } from "../worker-user";

// Repository interface — part of the domain layer.
// findById accepts a plain string UUID — the worker receives IDs from RabbitMQ
// message payloads which are already strings; no Guid wrapper needed here.
export interface IUserRepository {
  findById(id: string): Promise<Result<WorkerUser, UserWorkerPersistenceError>>;
}
