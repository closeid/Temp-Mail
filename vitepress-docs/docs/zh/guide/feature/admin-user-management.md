# Admin 用户相关

## 用户管理页面

![admin-user-management](/feature/admin-user-management.png)

## 用户设置

此处开启用户登录，以及验证等配置

![admin-user-page](/feature/admin-user-page.png)

## 角色地址配置

“角色地址配置”限制某个用户角色最多可以绑定多少个邮箱地址。角色级限制优先于“用户设置”中的全局地址上限；留空表示继承全局设置，`0` 表示不限制。该配置只影响用户绑定地址的数量，不会改变角色权限，也不会删除已经绑定的地址。

## 账号安全与 Passkey

所有新设置的用户密码都必须至少为 8 位，并且同时包含英文大写字母、英文小写字母、数字和符号。此规则适用于注册、找回密码、已登录用户修改密码、管理员创建用户和管理员重置密码。

已登录用户可以在“账号设置 -> 安全”中修改账号密码。浏览器会先校验新密码规则，再将当前密码和新密码分别生成 SHA-256 派生值；Worker 只接受 64 位十六进制校验值，并在写入 D1 前进行 HMAC 保护。请求时在 `x-user-token` 请求头中携带用户 JWT：

```http
POST /api/user/change_password
Content-Type: application/json
x-user-token: <user-jwt>

{
  "current_password": "<sha256-当前密码>",
  "new_password": "<sha256-新密码>"
}
```

`POST /api/user/register` 的 `password` 字段，以及后台接口 `POST /api/admin/users` 与 `POST /api/admin/users/:user_id/reset_password` 的 `password` 字段，同样只接收客户端生成的 SHA-256 校验值，不接收密码明文。官方前端会在生成派生值前执行密码规则校验；Worker 无法从不可逆派生值反推出密码组成，因此直接调用 API 的客户端也必须执行相同规则。

该兼容协议避免在应用层请求体中发送密码明文，但 SHA-256 派生值仍属于可用于认证的敏感凭据，所有请求仍必须通过 HTTPS，日志中不得记录请求体。需要抗重放的无密码方案时，应优先使用本应用已经支持的 Passkey；SRP/OPAQUE 等 PAKE 协议需要完整的注册、挑战、证明及数据迁移流程，不能通过自制“二次加密”替代。

管理员重置密码弹窗可以生成并填充符合规则的 12 位密码。生成器使用浏览器密码学安全随机源，并保证四类必需字符均至少出现一次。点击“生成密码”后会自动复制到系统剪贴板并提示复制成功，生成值会直接显示以便管理员交付；手动编辑输入框后会立即恢复密码掩码。

后台“用户管理”的操作菜单新增“管理 Passkey”。管理员可以查看或删除用户已注册的 Passkey，但不能代替用户创建或重命名。对应的后台 API 为：

- `GET /api/admin/users/:user_id/passkeys`
- `DELETE /api/admin/users/:user_id/passkeys/:passkey_id`

两个后台接口均使用常规后台管理员认证请求头。
