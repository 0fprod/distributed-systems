import type { UserDTO } from "@distributed-systems/shared";

import type { BackendUser } from "#users/domain/user";

export function toUserDTO(user: BackendUser): UserDTO {
  return {
    id: user.id.value,
    name: user.name,
    email: user.email,
  };
}
