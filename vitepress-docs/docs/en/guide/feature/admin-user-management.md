# Admin User Management

## User Management Page

![admin-user-management](/feature/admin-user-management.png)

## User Settings

Configure user login and authentication settings here

![admin-user-page](/feature/admin-user-page.png)

## Role Address Configuration

Role Address Configuration limits how many mailbox addresses a user with a given role may bind. A role-specific value takes precedence over the global limit in User Settings; leave it blank to inherit the global value, or use `0` for unlimited. This setting only controls binding capacity. It does not grant permissions or remove addresses that are already bound.

## Account Security and Passkeys

Every newly assigned user password must be at least 8 characters and include an uppercase English letter, a lowercase English letter, a number, and a symbol. This applies to registration, password recovery, signed-in password changes, administrator-created users, and administrator password resets.

Signed-in users can change their account password from **Settings -> Security**. The browser validates the new-password policy first, then derives separate SHA-256 values for the current and new passwords. The Worker accepts only 64-character hexadecimal verifiers and HMAC-protects them before writing to D1. Send the account JWT in the `x-user-token` header:

```http
POST /api/user/change_password
Content-Type: application/json
x-user-token: <user-jwt>

{
  "current_password": "<sha256-current-password>",
  "new_password": "<sha256-new-password>"
}
```

The `password` field of `POST /api/user/register`, `POST /api/admin/users`, and `POST /api/admin/users/:user_id/reset_password` likewise accepts only a client-derived SHA-256 verifier, never plaintext. The official frontend applies the password policy before deriving it. Because the Worker cannot infer password composition from an irreversible verifier, direct API clients must apply the same policy.

This compatibility protocol avoids plaintext passwords in application request bodies, but the SHA-256 verifier remains a sensitive authentication credential. Always use HTTPS and never log request bodies. Prefer the application's Passkey support for a replay-resistant passwordless flow. SRP/OPAQUE PAKE requires complete enrollment, challenge, proof, and migration handling and must not be replaced by custom "extra encryption".

The administrator reset-password dialog can generate and fill a compliant 12-character password. The generator uses the browser cryptographic random source and guarantees all four required character groups. Selecting **Generate password** copies the value to the system clipboard and confirms the copy. Generated values are shown directly for secure handoff; manual edits immediately restore password masking.

The User Management action menu includes **Manage Passkeys**. Administrators can inspect or revoke a user's registered Passkeys without creating or renaming them. The administration API equivalents are:

- `GET /api/admin/users/:user_id/passkeys`
- `DELETE /api/admin/users/:user_id/passkeys/:passkey_id`

Both administration endpoints require the normal administrator authentication headers.
