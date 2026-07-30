# Admin 控制台

> [!NOTE]
> 需要配置 `ADMIN_PASSWORDS` 或者 `ADMIN_USER_ROLE` 才可以访问 admin 控制台
> admin 角色配置, 如果用户角色等于 ADMIN_USER_ROLE 则可以访问 admin 控制台

部署前端应用之后，点击左上角 logo 5 次或者访问 `/dashboard` 路径即可进入管理控制台。未认证时前端会自动跳转到 `/dashboard/login`，登录成功后返回原后台页面。Worker 的管理接口仍使用 `/api/admin/*` 路径。

> [!IMPORTANT]
> Worker API 现在仅使用 `/api` 命名空间。旧的 `/admin/*`、`/open_api/*`、`/user_api/*`、`/telegram/*`、`/external/api/*` 与 `/health_check` 地址不再转发，部署此版本前请先更新调用方。

需要在后端配置 `ADMIN_PASSWORDS` 或者当前用户角色为 `ADMIN_USER_ROLE`，否则不允许访问控制台。

## 管理口令和用户账号的区别

`ADMIN_PASSWORDS` 是 Admin 控制台的管理口令，不是站点用户账号，也不对应某个邮箱地址。使用管理口令登录后可以进入后台，但它本身不能收信。

站点用户账号存储在 `users` 表中，需要通过用户登录体系进入；用户是否能收信取决于是否创建或绑定了邮箱地址。即使你创建了一个邮箱为 `admin@example.com` 或用户名看起来像 `admin` 的普通用户，它也不会自动获得后台权限。

如果希望某个用户也能进入 Admin 控制台，请配置 `ADMIN_USER_ROLE`，并在用户管理中给该用户设置相同的角色。

## 修改管理员密码

使用 `ADMIN_PASSWORDS` 登录后，可在 **用户 -> Admin** 中修改管理员密码。新密码会覆盖部署变量中的管理员密码用于后续登录；D1 的 `settings` 表只保存 SHA-256 哈希，不保存明文。通过 `ADMIN_USER_ROLE` 或后台访问令牌进入的会话不能修改这个根管理员密码。

如遗忘修改后的密码，可在 D1 控制台执行以下语句，删除覆盖值并恢复使用 `ADMIN_PASSWORDS`：

```sql
DELETE FROM settings WHERE key = 'admin_password_hash';
```

## 后台访问令牌

在 **用户 -> 访问令牌** 中可生成具有全部 `/api/admin/*` 权限的令牌。每个令牌必须设置名称，可选设置精确过期时间；明文只在创建成功后显示一次，D1 只保存令牌哈希。删除令牌会立即撤销访问。

升级已有数据库后，请先运行后台数据库迁移，或执行 `db/2026-07-30-admin-access-tokens.sql`。

调用时通过 `x-admin-token` 请求头发送令牌：

```bash
curl "https://mail.example.com/api/admin/statistics" \
  -H "x-admin-token: gae_admin_your_token"
```

访问令牌提供后台管理权限，但不会伪造某个邮箱或普通用户身份；需要邮箱 JWT 或用户 JWT 上下文的接口仍使用各自的认证方式。

![admin](/feature/admin.png)

## 账号列表排序

管理后台的账号标签页支持按列排序，可点击表头对以下列进行升序/降序排列：

- ID
- 名称
- 创建时间
- 更新时间
- 邮件数量
- 发送数量

搜索邮箱地址时，分页会自动重置到第 1 页。

## 如果你的网站只可私人访问，可通过此禁用检查

`DISABLE_ADMIN_PASSWORD_CHECK = true`

## IP 黑名单 / 白名单

在 Admin 控制台 → **IP 黑名单设置** 页面可配置访问控制，作用于以下接口：创建邮箱地址、发送邮件、外部发送邮件 API、用户注册、验证码校验。

### IP 白名单（严格模式）

启用后，**仅**匹配白名单的 IP 才能访问受保护接口，其他所有 IP 一律返回 403。

- 纯文本条目：精确匹配（不支持子串），例如 `1.2.3.4`
- 正则条目：使用锚定正则，例如 `^192\.168\.1\.\d+$`
- 白名单命中的 IP 会跳过黑名单检查
- 白名单启用但列表为空时，服务端忽略该开关（防止锁死）

### IP 黑名单

启用后，匹配黑名单的 IP 返回 403。支持文本子串匹配或正则表达式。

### ASN 组织黑名单

按运营商/ISP 拉黑，不区分大小写，支持文本匹配或正则。

### 浏览器指纹黑名单

按 `x-fingerprint` 请求头拉黑，支持精确匹配或正则。

### 每日请求限流

限制单个 IP 每天最多请求次数（1–1,000,000），超出返回 429。计数以 UTC 日期为周期，24 小时后自动重置。
