# Get an Email

基于 Cloudflare Workers、Email Routing 和 D1 的临时邮箱服务。项目包含响应式 Web 客户端、用户系统、地址凭据登录、管理后台、邮件发送、Webhook、OAuth2、Passkey 和多语言支持。

[中文](README.md) | [English](README_EN.md) | [日本語](README_JA.md) | [更新日志](CHANGELOG.md)

> 本项目仅供学习和个人用途。部署者需要自行遵守域名、邮件服务商和所在地的法律及服务条款。

## 功能

- 接收、解析、搜索和删除邮件，查看附件、原文及全屏内容
- 匿名地址、地址密码、地址 JWT 凭据、注册用户和 Passkey 登录
- 用户地址绑定、切换、转移和解绑
- Cloudflare Email Workers、Resend 或 SMTP 发信
- OAuth2 联合登录、角色和域名分配、发信余额管理
- 全局及地址级 Webhook、自动回复、邮件转发、垃圾邮件检查
- 可选 Workers AI 内容提取、S3/R2 附件存储、Telegram 和 SMTP/IMAP 代理
- 中文、英文、日文、德文、西班牙文和葡萄牙文界面
- 管理后台路径 `/dashboard`，全部后端接口统一位于 `/api/`

## 架构

| 模块 | 技术 | 作用 |
| --- | --- | --- |
| `frontend/` | Vite、React、React Router、TanStack Query、Tailwind CSS、shadcn/ui、Radix UI | 用户端和管理后台 |
| `worker/` | Cloudflare Workers、Hono、TypeScript | HTTP API、邮件接收、鉴权和定时任务 |
| `db/` | Cloudflare D1 / SQLite | 当前 Schema 和历史升级脚本 |
| `pages/` | Cloudflare Pages Functions | 可选的同源 `/api/` Service Binding 转发 |
| `vitepress-docs/` | VitePress | 完整变量和扩展功能文档 |

D1 为必需资源。KV 在邮件验证码、Webhook、Telegram 等功能中使用；Workers AI、S3/R2 和其他 Worker Service Binding 均为可选资源。

## 部署前准备

需要准备：

- 已将 DNS 托管到 Cloudflare 的域名或子域名
- 已在该域名上启用 Cloudflare Email Routing
- Cloudflare 账户和 Wrangler 登录权限
- Git、Node.js 24 和 pnpm 10

安装 pnpm 并登录 Cloudflare：

```bash
corepack enable
corepack prepare pnpm@10 --activate
```

克隆项目并安装依赖：

```bash
git clone https://github.com/closeid/Temp-Mail.git
cd Temp-Mail
cd worker
pnpm install
pnpm wrangler login
cd ../frontend
pnpm install
cd ..
```

## 快速部署：前后端同一个 Worker

这是最简单的部署方式。页面和 `/api/` 使用同一域名，不需要额外配置 CORS 或 Pages Service Binding。

### 1. 创建 D1 和可选 KV

```bash
cd worker
pnpm wrangler d1 create getanemail
```

记录命令返回的 `database_name` 和 `database_id`。

注册邮件验证码、Webhook 或 Telegram 需要 KV：

```bash
pnpm wrangler kv namespace create KV
```

### 2. 配置 Worker

复制模板：

```bash
# macOS / Linux
cp wrangler.toml.template wrangler.toml

# Windows PowerShell
Copy-Item wrangler.toml.template wrangler.toml
```

至少修改以下内容：

```toml
name = "get-an-email"
main = "src/worker.ts"
compatibility_date = "2025-04-01"
compatibility_flags = ["nodejs_compat"]

routes = [
  { pattern = "mail.example.com", custom_domain = true },
]

[assets]
directory = "../frontend/dist/"
binding = "ASSETS"
run_worker_first = true

[vars]
PREFIX = "tmp"
DEFAULT_DOMAINS = ["example.com"]
DOMAINS = ["example.com"]
ENABLE_USER_CREATE_EMAIL = true
ENABLE_USER_DELETE_EMAIL = true
ENABLE_ADDRESS_PASSWORD = true

[[d1_databases]]
binding = "DB"
database_name = "getanemail"
database_id = "替换为 D1 ID"

# 使用邮件验证码、Webhook 或 Telegram 时取消注释
# [[kv_namespaces]]
# binding = "KV"
# id = "替换为 KV ID"
```

变量含义：

| 变量 | 必需 | 说明 |
| --- | --- | --- |
| `DOMAINS` | 是 | 系统接受和创建邮箱地址的全部域名 |
| `DEFAULT_DOMAINS` | 建议 | 匿名用户和无角色用户默认可选域名；为空时回退到 `DOMAINS` |
| `JWT_SECRET` | 是 | 签发地址和用户 JWT 的随机密钥 |
| `ADMIN_PASSWORDS` | 是 | 管理员密码 JSON 数组；未配置时不能使用密码进入后台 |
| `ENABLE_USER_CREATE_EMAIL` | 是 | 是否允许前端创建地址 |
| `ENABLE_USER_DELETE_EMAIL` | 建议 | 是否允许地址用户删除邮件 |
| `PASSWORDS` | 否 | 配置后，整个站点在进入前需要输入访问密码 |

不要把生产密钥提交到 Git。用随机值设置 Secret：

```bash
# 可用 openssl rand -hex 32 生成 JWT_SECRET
pnpm wrangler secret put JWT_SECRET

# 输入示例：["使用强密码"]
pnpm wrangler secret put ADMIN_PASSWORDS

# 可选的站点访问密码，输入示例：["使用另一个强密码"]
pnpm wrangler secret put PASSWORDS
```

完整变量列表见 [`worker/wrangler.toml.template`](worker/wrangler.toml.template) 和 [Worker 变量说明](vitepress-docs/docs/zh/guide/worker-vars.md)。

### 3. 初始化数据库

新部署直接执行当前完整 Schema：

```bash
pnpm wrangler d1 execute getanemail --remote --file=../db/schema.sql
```

也可以先部署，再使用 `/dashboard` 中的“维护 -> 数据库”检查并初始化数据库。已有数据库升级时不要重复执行 `schema.sql`，应查看 [CHANGELOG.md](CHANGELOG.md)，执行缺少的 `db/*-patch.sql`，或使用后台的“迁移数据库”。

### 4. 构建前端

同源部署需要让 `VITE_API_BASE` 为空：

```bash
cd ../frontend

# macOS / Linux
cp .env.pages .env.prod

# Windows PowerShell
Copy-Item .env.pages .env.prod

pnpm build
```

构建结果位于 `frontend/dist/`，由 Worker 的 `[assets]` 配置一起发布。

### 5. 部署 Worker

```bash
cd ../worker
pnpm deploy
```

部署后检查：

```text
https://mail.example.com/api/health
```

接口应返回健康状态；前端应能打开首页，管理后台位于 `https://mail.example.com/dashboard`。

### 6. 配置 Email Routing

对 `DOMAINS`、`DEFAULT_DOMAINS` 和角色配置中出现的每个收件域名执行：

1. Cloudflare Dashboard -> Email -> Email Routing，启用 Email Routing。
2. 按提示添加 Cloudflare 提供的 MX 和 SPF DNS 记录。
3. 在 Routing rules 中创建 Catch-all 规则。
4. Action 选择“Send to a Worker”，目标选择刚部署的 Worker。
5. 向新建地址发送测试邮件，确认收件箱出现邮件。

仅部署 HTTP Worker 而没有 Catch-all 规则时，网页可以打开，但不会收到邮件。随机子域地址还需要为 `*` 子域配置对应的通配 MX，详见 [子域名说明](vitepress-docs/docs/zh/guide/feature/subdomain.md)。

## 其他前端部署方式

三种方式只选一种。

### 独立 Cloudflare Pages，浏览器直连 Worker

复制并编辑 `frontend/.env.prod`：

```dotenv
VITE_API_BASE=https://api.example.com
VITE_CF_WEB_ANALY_TOKEN=
```

然后构建和部署：

```bash
cd frontend
pnpm build
pnpm exec wrangler pages deploy ./dist --project-name get-an-email --branch production
```

`VITE_API_BASE` 不要以 `/` 结尾。Pages 必须使用 SPA fallback，否则刷新 `/dashboard` 等路由会返回 404。

### 独立 Pages，通过 Service Binding 同源转发

此方式让浏览器只访问 Pages 域名，`pages/functions/_middleware.js` 把 `/api/` 转发给 Worker。

```bash
cd frontend
pnpm build:pages
cd ../pages
pnpm install
```

如 Worker 名称不是 `cloudflare_temp_email`，修改 `pages/wrangler.toml` 中的 `service`，然后执行：

```bash
pnpm deploy
```

### 使用 Release 文件手动上传

GitHub Actions 的 **Tag Build CI** 可手动运行，也会在成功的 Upstream Sync 后运行。它使用上海时区生成 `vYYYYMMDD-HHMMSS` 标签，并发布 `frontend.zip`、`worker.js` 和 WASM Worker 包。该工作流只构建 Release，不会替你创建 D1、KV、路由或 Cloudflare Secret。

手动上传前端时，Pages 的未找到处理必须设置为 **Single-page application (SPA)**。手动上传 Worker 时仍需在 Cloudflare Dashboard 绑定 D1、可选 KV、变量、Secret、Email Routing 和自定义域名。

## 本地开发

按照前面的 Worker 配置示例填写本地 `wrangler.toml`（包括 `database_name = "getanemail"`），再初始化本地 D1：

```bash
cd worker
cp wrangler.toml.template wrangler.toml
# 编辑 wrangler.toml 后继续
pnpm wrangler d1 execute getanemail --local --file=../db/schema.sql
pnpm dev
```

另开终端创建 `frontend/.env.local`：

```dotenv
VITE_API_BASE=http://127.0.0.1:8787
```

```bash
cd frontend
pnpm dev
```

浏览器打开 Vite 输出的地址。Email Routing 的真实收件事件不能完全在浏览器本地模拟，建议使用测试域名和远程 Worker 做最终收件验证。

常用检查命令：

```bash
cd frontend
pnpm exec tsc --noEmit
pnpm test
pnpm build

cd ../worker
pnpm lint
pnpm build
```

## 用户、登录与权限

首页整合了用户登录、注册、忘记密码、Passkey 和地址凭据登录。

- **地址凭据登录**：使用地址 JWT 或启用 `ENABLE_ADDRESS_PASSWORD` 后生成的地址密码。
- **用户注册**：默认可注册；后台“维护 -> 管理员 -> 用户设置”可开启邮件验证码。开启验证码时必须绑定 KV，并配置可用发信通道和验证码发件地址。
- **Passkey**：需要 HTTPS 和正确的站点域名。用户登录后在主页账户区域注册凭据。
- **OAuth2**：在 `/dashboard` 的“维护 -> 管理员 -> OAuth2”添加提供商。回调 URL 为 `https://你的前端域名/user/oauth2/callback`，必须与提供商后台完全一致。
- **管理员**：访问 `/dashboard`，使用 `ADMIN_PASSWORDS`，或让用户角色等于 `ADMIN_USER_ROLE`。不要在公网部署时开启 `DISABLE_ADMIN_PASSWORD_CHECK`。

OAuth2 是联合登录，同一邮箱映射到同一个本地用户；当前不是强制 OAuth-only 模式，不能通过配置 OAuth2 自动禁止密码登录。详细字段见 [OAuth2 配置](vitepress-docs/docs/zh/guide/feature/user-oauth2.md)。

## 配置发送邮件

后台“邮件 -> 发信配置”显示通道状态和匹配顺序，但密钥必须通过 Worker Secret 或 Binding 配置。用户发信还受余额、无限制地址和 `NO_LIMIT_SEND_ROLE` 控制。

### Cloudflare `SEND_MAIL` Binding

在 `worker/wrangler.toml` 顶层添加：

```toml
send_email = [
  { name = "SEND_MAIL" },
]
```

绑定名必须是 `SEND_MAIL`。域名需要先完成 Email Routing onboarding。可用 `SEND_MAIL_DOMAINS = ["example.com"]` 限制允许的发件域名。

### Resend

在 Resend 完成发件域名 DNS 验证后设置 API Key：

```bash
cd worker
pnpm wrangler secret put RESEND_TOKEN
```

不同域名使用不同 Key 时，变量名为 `RESEND_TOKEN_<大写域名>`，点号替换为下划线，例如：

```bash
pnpm wrangler secret put RESEND_TOKEN_EXAMPLE_COM
```

Resend 的验证 CNAME 在 Cloudflare DNS 中应设为“仅 DNS”。

### SMTP

将以下 JSON 作为 `SMTP_CONFIG` Secret；最外层 key 必须与发件域名一致：

```json
{
  "example.com": {
    "host": "smtp.example.com",
    "port": 465,
    "secure": true,
    "authType": ["plain", "login"],
    "credentials": {
      "username": "smtp-user",
      "password": "smtp-password"
    }
  }
}
```

```bash
pnpm wrangler secret put SMTP_CONFIG
```

完整优先级、余额规则和多域名示例见 [发送邮件配置](vitepress-docs/docs/zh/guide/config-send-mail.md)。

## Webhook 和可选能力

### Webhook

1. 创建并绑定 `KV`。
2. 设置 `[vars] ENABLE_WEBHOOK = true`。
3. 建议设置 `FRONTEND_URL = "https://mail.example.com"`。
4. 重新部署 Worker。
5. 管理员在 `/dashboard` 的 Webhook 页面保存全局模板并授权地址；普通地址再在主页配置自己的 Webhook。

当 `ENABLE_WEBHOOK` 为 `false` 时，管理员仍可预先编辑配置，但不会实际投递。模板及 Telegram、企业微信、Discord 示例见 [Webhook 配置](vitepress-docs/docs/zh/guide/feature/webhook.md)。

### Workers AI 邮件提取

```toml
[vars]
ENABLE_AI_EMAIL_EXTRACT = true
AI_EXTRACT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast"

[ai]
binding = "AI"
```

未绑定 AI 时会回退到基础验证码正则提取。

### S3/R2 附件存储

依次配置 `S3_ENDPOINT`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY` 和 `S3_BUCKET` Secret。详细说明见 [S3 附件配置](vitepress-docs/docs/zh/guide/feature/s3-attachment.md)。

### 定时清理

在 `wrangler.toml` 顶层启用 Cron，例如每天 UTC 00:00 运行：

```toml
[triggers]
crons = ["0 0 * * *"]
```

清理策略在后台维护页面配置。

## 使用方法

### 普通邮箱

1. 首页选择名称和域名创建地址，或随机生成地址。
2. 保存地址凭据；未绑定到用户的地址丢失凭据后无法恢复。
3. 在收件箱选择邮件，查看正文、附件、纯文本、原文或全屏视图。
4. 使用地址管理绑定、切换、转移或解绑地址。
5. 登录用户可集中管理多个地址、Passkey、Webhook、自动回复和发信权限。

### 管理后台

访问 `/dashboard`。后台提供地址、用户、未知邮件、发件、角色地址、OAuth2、Webhook、数据库、系统设置、统计和 API 文档。所有程序接口均位于当前域名的 `/api/`；具体请求方法、路径和鉴权方式以后台“API 文档”页面及 Worker 源码为准。

## 升级

1. 备份 D1 数据和 `wrangler.toml`。
2. 拉取新代码并阅读中英文更新日志中的 Breaking Changes。
3. 分别在 `worker/`、`frontend/` 和使用中的 `pages/` 执行 `pnpm install`。
4. 执行要求的数据库 patch，或在后台运行数据库迁移。
5. 重新构建前端并覆盖部署 Worker/Pages。
6. 使用无痕窗口验证首页、`/dashboard`、`/api/health`、收件和发件。

不要对已有数据库重新执行完整 `schema.sql`。

## 排错

| 现象 | 检查项 |
| --- | --- |
| 页面能打开但收不到邮件 | Email Routing 已启用；MX/SPF 已生效；Catch-all 指向正确 Worker；域名存在于 `DOMAINS` |
| `/dashboard` 无法登录 | `ADMIN_PASSWORDS` 是 JSON 数组或可解析的 Secret；部署后变量已生效 |
| 注册验证码不发送 | KV 已绑定；后台开启邮件验证；验证码发件地址和至少一个发信通道可用 |
| Webhook 显示未启用 | KV 已绑定；`ENABLE_WEBHOOK=true`；重新部署后检查 Worker 当前版本变量 |
| 发信失败 | 后台发信配置状态；发件域名匹配；Resend/SMTP Secret；`SEND_MAIL` binding；用户余额 |
| Pages 刷新子路由 404 | Pages fallback 设置为 SPA，或改用 CLI 部署 |
| 前端仍请求旧地址 | 检查构建时的 `frontend/.env.prod` 和 `VITE_API_BASE`，清理浏览器/PWA 缓存后重建 |
| D1 提示缺表或版本过旧 | 新库初始化 `db/schema.sql`；旧库执行缺少的 patch 或后台迁移 |

更完整的专项说明位于 [`vitepress-docs/docs/zh/guide/`](vitepress-docs/docs/zh/guide/)。

## 安全建议

- `JWT_SECRET`、管理员密码、OAuth Client Secret、Resend 和 SMTP 凭据只存为 Cloudflare Secret。
- 为 `/dashboard` 使用强密码；不要启用跳过管理员校验。
- 公网站点建议启用 Turnstile、地址限流、附件限制和定时清理。
- 发信功能应设置余额、域名限制和服务商额度告警，避免被滥用。
- 定期备份 D1，并在升级前测试数据库迁移。

## 许可证

本项目使用 [MIT License](LICENSE)。
