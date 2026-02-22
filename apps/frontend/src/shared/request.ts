export async function request(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, init);
}
