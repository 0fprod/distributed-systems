import * as Sentry from "@sentry/react";

export async function request(input: RequestInfo | URL, init?: RequestInit) {
  const requestId = crypto.randomUUID();

  const headers = new Headers(init?.headers);
  headers.set("X-Request-ID", requestId);

  const response = await fetch(input, { ...init, headers });

  if (response.status >= 500) {
    const responseRequestId = response.headers.get("x-request-id");
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    Sentry.captureMessage(`HTTP ${response.status} ${url}`, {
      level: "error",
      tags: { requestId: responseRequestId ?? requestId },
    });
  }

  return response;
}
