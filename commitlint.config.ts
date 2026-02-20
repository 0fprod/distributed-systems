import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "revert",
        "style",
        "test",
      ],
    ],
    "subject-case": [2, "always", "lower-case"],
    "body-max-line-length": [2, "always", 100],
    "footer-max-line-length": [2, "always", 100],
  },
};

export default config;
