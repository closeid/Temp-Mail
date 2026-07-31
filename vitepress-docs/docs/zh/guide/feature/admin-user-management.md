# Admin 用户相关

## 用户管理页面

![admin-user-management](/feature/admin-user-management.png)

## 用户设置

此处开启用户登录，以及验证等配置

![admin-user-page](/feature/admin-user-page.png)

## 角色地址配置

“角色地址配置”限制某个用户角色最多可以绑定多少个邮箱地址。角色级限制优先于“用户设置”中的全局地址上限；留空表示继承全局设置，`0` 表示不限制。该配置只影响用户绑定地址的数量，不会改变角色权限，也不会删除已经绑定的地址。

## 账号安全与 Passkey

已登录用户可以在“账号设置 -> 安全”中修改账号密码。请求会同时校验当前密码和新密码，并使用与登录一致的客户端 SHA-256 密码表示。请求时在 `x-user-token` 请求头中携带用户 JWT：

```http
POST /api/user/change_password
Content-Type: application/json
x-user-token: <user-jwt>

{
  "current_password": "<sha256-当前密码>",
  "new_password": "<sha256-新密码>"
}
```

后台“用户管理”的操作菜单新增“管理 Passkey”。管理员可以查看或删除用户已注册的 Passkey，但不能代替用户创建或重命名。对应的后台 API 为：

- `GET /api/admin/users/:user_id/passkeys`
- `DELETE /api/admin/users/:user_id/passkeys/:passkey_id`

两个后台接口均使用常规后台管理员认证请求头。
