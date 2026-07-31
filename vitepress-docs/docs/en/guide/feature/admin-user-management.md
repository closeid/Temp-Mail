# Admin User Management

## User Management Page

![admin-user-management](/feature/admin-user-management.png)

## User Settings

Configure user login and authentication settings here

![admin-user-page](/feature/admin-user-page.png)

## Role Address Configuration

Role Address Configuration limits how many mailbox addresses a user with a given role may bind. A role-specific value takes precedence over the global limit in User Settings; leave it blank to inherit the global value, or use `0` for unlimited. This setting only controls binding capacity. It does not grant permissions or remove addresses that are already bound.

## Account Security and Passkeys

Signed-in users can change their account password from **Settings -> Security**. The request requires both the current and new password and uses the same client-side SHA-256 password representation as sign-in requests. Send the account JWT in the `x-user-token` header:

```http
POST /api/user/change_password
Content-Type: application/json
x-user-token: <user-jwt>

{
  "current_password": "<sha256-current-password>",
  "new_password": "<sha256-new-password>"
}
```

The User Management action menu includes **Manage Passkeys**. Administrators can inspect or revoke a user's registered Passkeys without creating or renaming them. The administration API equivalents are:

- `GET /api/admin/users/:user_id/passkeys`
- `DELETE /api/admin/users/:user_id/passkeys/:passkey_id`

Both administration endpoints require the normal administrator authentication headers.
