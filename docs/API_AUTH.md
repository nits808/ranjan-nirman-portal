# API authentication contract (Spring Boot + portal)

This document describes how the **Ranjan Nirman Portal** (`src/api.js`) expects the backend to behave. Implement these rules in Spring Security so APIs are not only protected in the UI but on the server.

## Login: `POST /api/login`

**Request body (JSON):**

```json
{ "email": "user@example.com", "password": "secret" }
```

**Successful response (JSON):** HTTP 200

The portal accepts any of the following JWT field names (first match wins):

| Field           | Description                                      |
|----------------|--------------------------------------------------|
| `accessToken`  | Preferred: OAuth2-style access token (JWT)       |
| `token`        | Alternative JWT field name                      |

Additionally, the portal persists these fields in `localStorage` after login:

| Field        | Required for UI | Description                          |
|-------------|-----------------|--------------------------------------|
| `status`    | Yes             | Must be `"SUCCESS"` for login to succeed |
| `role`      | Yes             | `"ADMIN"` or `"STANDARD"`            |
| `email`     | Recommended     | Shown in dashboards                  |
| `name`      | Optional        | Display name                         |
| `employeeId`| Optional        | Employee record id for timesheets etc. |

**Example success payload:**

```json
{
  "status": "SUCCESS",
  "role": "STANDARD",
  "email": "user@example.com",
  "name": "Jane Doe",
  "employeeId": "42",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error response:** Non-200 or JSON with `status` not `SUCCESS`; `message` is shown to the user when present.

## Authenticated requests

For every request **except** `POST /api/login` and **public** endpoints (see below), the browser sends:

```http
Authorization: Bearer <accessToken>
```

Spring Security should:

1. Validate the JWT (signature, expiry, issuer).
2. Derive the user identity and roles from the token (or load the user from the DB).
3. Authorize by role: `ADMIN` vs `STANDARD` as appropriate per endpoint.

If the token is missing, invalid, or expired, return **401 Unauthorized**. The portal clears local storage and redirects to `/login`.

## Public endpoints (no JWT)

These must be permitted without authentication (e.g. `permitAll()` in Spring Security):

| Method | Path                 | Purpose                    |
|--------|----------------------|----------------------------|
| `POST` | `/api/login`         | Login                      |
| `POST` | `/api/quote-requests` | Public “Request a quote” form |

All other `/api/**` routes should require a valid JWT unless you intentionally expose them.

## CORS and production

- In development, Vite proxies `/api` to `http://localhost:8080` (see `vite.config.js`).
- In production, set `VITE_API_BASE` to the full API base URL (e.g. `https://api.yourdomain.com/api`) or serve the SPA behind the same origin so relative `/api` still works.

## Security checklist

- [ ] Never trust `localStorage` `userRole` alone; enforce roles on the server.
- [ ] Use HTTPS in production.
- [ ] Rotate signing keys and use short JWT expiry; refresh tokens if sessions are long-lived.
- [ ] Rate-limit `/api/login` and `/api/quote-requests`.
