import { check, sleep } from "k6";
import http from "k6/http";

const BASE_URL = "http://localhost:30000";

export function setup() {
  // Register (ignore error if already exists)
  http.post(
    `${BASE_URL}/register`,
    JSON.stringify({ name: "Stress User", email: "stress@test.com", password: "password123" }),
    { headers: { "Content-Type": "application/json" } },
  );

  // Login — auth is cookie-based, not JWT
  const loginRes = http.post(
    `${BASE_URL}/login`,
    JSON.stringify({ email: "stress@test.com", password: "password123" }),
    { headers: { "Content-Type": "application/json" } },
  );

  check(loginRes, { "login 200": (r) => r.status === 200 });

  // Extract the session cookie value from Set-Cookie header
  const setCookie = loginRes.headers["Set-Cookie"] || "";
  const match = setCookie.match(/session=[^;]+/);
  const sessionCookie = match ? match[0] : "";

  return { sessionCookie };
}

export const options = {
  vus: 50,
  duration: "30s",
};

export default function (data) {
  const headers = {
    "Content-Type": "application/json",
    Cookie: data.sessionCookie,
  };

  const payload = JSON.stringify({
    // eslint-disable-next-line no-undef
    name: `Invoice VU${__VU} iter${__ITER}`,
    amount: Math.floor(Math.random() * 1000) + 1,
  });

  const res = http.post(`${BASE_URL}/invoices`, payload, { headers });

  check(res, {
    "invoice created": (r) => r.status === 201,
  });

  sleep(0.1);
}
