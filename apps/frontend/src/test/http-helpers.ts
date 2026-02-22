export function httpOk<T>(body: T, init?: ResponseInit) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
      ...init,
    }),
  );
}

export function httpError(status = 500, statusText = "Internal Server Error", body?: unknown) {
  return Promise.resolve(
    new Response(body ? JSON.stringify(body) : "", {
      status,
      statusText,
      headers: { "content-type": "application/json" },
    }),
  );
}

export function networkError(message = "Network error") {
  return Promise.reject(new Error(message));
}
