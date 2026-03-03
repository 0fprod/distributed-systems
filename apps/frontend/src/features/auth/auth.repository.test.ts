import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, mock, test } from "bun:test";

import { httpError, httpOk } from "#test/http-helpers";
import { makeClient, makeWrapper } from "#test/query-helpers";

const requestMock = mock();

mock.module("#shared/request", () => ({
  request: requestMock,
}));

beforeEach(() => {
  requestMock.mockReset();
});

async function renderCurrentUser() {
  const { useCurrentUser } = await import("./auth.repository");
  const client = makeClient();
  let result!: ReturnType<typeof renderHook<ReturnType<typeof useCurrentUser>, unknown>>;
  await act(async () => {
    result = renderHook(() => useCurrentUser(), { wrapper: makeWrapper(client) });
  });
  return result;
}

test("returns null and isLoading=true initially", async () => {
  requestMock.mockImplementation(() => new Promise(() => {}));

  const { result } = await renderCurrentUser();

  expect(result.current.isLoading).toBe(true);
  expect(result.current.data).toBeNull();
});

test("returns user data on successful GET /me", async () => {
  const user = { id: 1, email: "jane@example.com" };
  requestMock.mockImplementation(() => httpOk(user));

  const { result } = await renderCurrentUser();

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(user);
  });
});

test("returns null when GET /me responds with 401", async () => {
  requestMock.mockImplementation(() => httpError(401, "Unauthorized"));

  const { result } = await renderCurrentUser();

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
  });
});

test("calls GET /me", async () => {
  const user = { id: 1, email: "jane@example.com" };
  requestMock.mockImplementation(() => httpOk(user));

  await renderCurrentUser();

  await waitFor(() => {
    const getCall = requestMock.mock.calls.find(
      (call) => !call[1] || (call[1] as RequestInit | undefined)?.method === undefined,
    );
    expect(getCall).toBeDefined();
    expect(getCall![0]).toBe("/me");
  });
});
