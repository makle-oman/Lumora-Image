# Lumora 后端开发与联调交接

## 项目边界

- 前端：`lumora-image-studio`
- 后端：同级独立项目 `../lumora-image-studio-backend`
- 管理端：同级独立项目 `../lumora-admin/apps/web-antdv-next`
- 前端构建只执行 Vue/Vite，不包含 Rust/Cargo。
- 前端 `src/services` 只保留 HTTP 客户端；上游生图请求、密钥使用、数据持久化全部由 Rust 后端负责。

生产后端统一部署在 `https://makle.cloud`，管理端地址为 `https://makle.cloud/admin/`。桌面安装包不再内置或启动 sidecar，账号、积分、任务、日志、设备和图片元数据全部进入服务器 SQLite；桌面生成图片下载到用户选择的本地目录后，服务器删除暂存文件。

## 技术方案

- Rust + Axum
- SQLite：开发环境 `lumora-image-studio-backend/data/lumora.db`，生产环境 Docker 卷 `/app/data/lumora.db`
- 图片文件：Web/API 图片保存在服务器；桌面图片确认落盘后仅保存在 EXE 本地目录
- 密码：Argon2 哈希
- 登录态：HttpOnly Cookie
- 上游生图：OpenAI 兼容 `POST /v1/images/generations`
- 模型：`gpt-image-2`

`baseUrl`、`apiKey`、模型和当前启用调用方保存在 SQLite，不读取 `.env`。调用方 API Key 只在 Rust 进程内用于上游请求，前端列表仅接收脱敏值。

## 数据表

| 表 | 用途 |
| --- | --- |
| `users` | 用户、套餐、积分、密码哈希 |
| `sessions` | Cookie 登录会话 |
| `api_keys` | Lumora 对外 API Key |
| `providers` | 上游调用方、Base URL、API Key、启用状态 |
| `images` | 图片元数据与本地文件名 |
| `announcements` | 系统公告 |
| `usage_logs` | 生图状态、耗时、积分记录 |
| `devices` | 设备 ID、平台、客户端版本、最后活跃时间 |
| `credit_ledger` | 注册赠送、人工调整和调用消耗流水 |
| `system_settings` | 注册赠送积分、默认每日调用限额 |
| `admin_audit_logs` | 管理操作审计 |

## 应用接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/health` | 当前用户是否已配置调用方 |
| `GET` | `/api/session` | 当前登录用户 |
| `POST` | `/api/auth/register` | 注册 |
| `POST` | `/api/auth/login` | 登录 |
| `POST` | `/api/auth/logout` | 退出 |
| `PUT` | `/api/account/profile` | 修改资料与密码 |
| `POST` | `/api/activity/heartbeat` | 更新设备与在线状态 |
| `GET` | `/api/announcements` | 公告列表 |
| `GET/POST` | `/api/api-keys` | 对外 API Key 列表/创建 |
| `DELETE` | `/api/api-keys/:id` | 废弃 API Key |
| `GET/POST` | `/api/providers` | 调用方列表/创建 |
| `PUT` | `/api/providers/:id/activate` | 选择当前调用方 |
| `DELETE` | `/api/providers/:id` | 删除调用方 |
| `GET` | `/api/usage` | 用量与调用记录 |
| `GET/DELETE` | `/api/images` | 图片列表/全部删除 |
| `POST` | `/api/images/generate/async` | 创建异步生图任务 |
| `POST` | `/api/images/edit/async` | 创建异步编辑任务 |
| `GET` | `/api/image-tasks/:ids` | 查询异步任务状态 |
| `PUT` | `/api/images/:id/visibility` | 修改图片公开状态 |
| `DELETE` | `/api/images/:id` | 删除图片及本地文件 |
| `GET` | `/api/images/:id/file` | 读取当前用户图片 |
| `POST` | `/api/images/:id/local` | 确认桌面图片已保存并删除服务器暂存文件 |
| `GET` | `/api/gallery` | 公共画廊元数据 |
| `GET` | `/public/images/:id` | 读取公开图片 |

## 管理端接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/admin/session` | 管理员会话与权限校验 |
| `GET` | `/api/admin/overview` | 用户、设备、调用和积分概览 |
| `GET/PUT` | `/api/admin/users`、`/api/admin/users/:id` | 用户列表与账号设置 |
| `POST` | `/api/admin/users/:id/credits` | 人工调整积分 |
| `GET` | `/api/admin/credit-ledger` | 积分流水 |
| `GET` | `/api/admin/usage-logs` | 调用日志、IP 与设备信息 |
| `GET/PUT` | `/api/admin/settings` | 注册赠送积分与默认每日限额 |
| `GET/POST/PUT/DELETE` | `/api/admin/providers...` | 全局服务配置 |
| `POST/PUT/DELETE` | `/api/admin/announcements...` | 公告管理 |

管理端包含工作台、用户管理、调用日志、积分流水、服务配置、公告管理、系统配置；全部列表使用 `vxe-table`。

## 画廊范围

- 桌面端 `/gallery` 导航和页面保持公开，不因图片改为本地存储而隐藏。
- 当前服务器中标记为公开且文件仍在服务器的作品全部进入公共画廊，支持分类和提示词检索。
- 桌面生成图片保存到用户本地目录后，服务器只保留元数据并纳入管理端图片统计，不向公共画廊暴露无法访问的本地文件。
- 后续具备云存储条件时，再将公共图片文件迁移到对象存储；当前版本不以云存储作为上线前置条件。

## 前端联调范围

- 登录、注册、退出改为后端会话。
- 用户资料、积分、公告改为 SQLite 数据。
- API Key 创建与废弃改为后端接口。
- 新增调用方配置、选择和删除界面。
- 生图改由 Rust 调用当前启用调用方，统一写入服务器 SQLite；桌面图片文件随后迁移到 EXE 本地目录。
- 画廊加载、删除和清空改为后端接口。
- API 概览与调用记录改为后端统计。

## 执行计划与状态

- [x] 梳理前端状态、交互和现有接口
- [x] 创建独立 Rust 项目
- [x] 建立 SQLite 表和本地图片目录
- [x] 实现认证、公告、API Key、调用方、用量、图片接口主体
- [x] 完成前端调用方管理与用量页面对接
- [x] 实现并验证 Lumora 对外 `/v1` API Key 调用入口
- [x] 完成管理端后端接口与 Vben 前端对接
- [x] 完成调用 IP、设备 ID、平台、客户端版本和 User-Agent 记录
- [x] 完成全局注册赠送积分与默认每日调用限额
- [x] 完成 Rust 编译检查与测试（20 项测试通过）
- [x] 完成桌面端测试（18 项）与生产构建
- [x] 完成管理端生产构建及 7 个菜单页面联调
- [x] 将桌面安装包的账号、积分、服务配置和调用日志切换到集中后端
- [x] 部署生产后端与 Vben 管理端，完成管理员登录和管理接口联调
- [x] 构建默认连接 `https://makle.cloud` 的 NSIS 桌面安装包
- [x] 保留公开画廊入口和现有公开作品展示，明确云端公开存储为后续项
- [x] 回填最终联调结果

## 联调顺序

1. 启动后端：在 `lumora-image-studio-backend` 执行 `cargo run`。
2. 启动桌面前端：在 `lumora-image-studio` 执行 `pnpm dev`；开发管理端在 `lumora-admin` 执行 `pnpm dev`。
3. 注册测试用户并验证 HttpOnly Cookie 会话。
4. 新建两个本地 Mock 调用方，切换启用项并验证 `/api/health`。
5. 调用 `/api/images/generate`，验证请求发送给当前调用方。
6. 验证服务器 SQLite 元数据、积分扣减和用量日志；桌面端确认图片原子写入本地目录并清理服务器暂存文件。
7. 刷新页面验证用户、调用方、图片和调用记录持久化。
8. 删除单图、清空画廊、废弃 API Key、退出并验证权限边界。
9. 执行 Rust 与 Vue 构建，记录最终结果。

## 配置约定

调用方通过页面或 `/api/providers` 写入：

```json
{
  "name": "OpenAI Production",
  "baseUrl": "https://api.openai.com",
  "apiKey": "<由部署人员填写>"
}
```

后端自动拼接 `/v1/images/generations`；若 `baseUrl` 已以 `/v1` 结尾，则只拼接 `/images/generations`。非本机调用方必须使用 HTTPS。

## 当前注意事项

- Rust 20 项测试、桌面端 18 项测试、桌面端构建、NSIS 打包和管理端构建已通过。
- 生产后端、管理端登录、工作台及用户、日志、积分、设置、服务配置、公告接口已联调通过。
- 生产环境 `/gallery` 直达返回 200，公共画廊仅展示仍有服务器文件的公开作品。
- 管理端 5 个列表页统一使用 VXE 自适应高度布局，分页固定在可视区域底部。
- 生产 SQLite 已升级到 schema 5，升级前数据卷备份保存在服务器 `/opt/lumora-backups/`。
- 桌面账号与管理端使用同一个服务器数据库，管理端可统计桌面端真实用户和调用数据。
- 生产库历史迁移和联调数据已清理，仅保留管理员账号、系统配置和一条初始积分流水；清洗前备份保存在服务器 `/opt/lumora-backups/`。
- 不在仓库、日志或文档中写入真实凭证。
- OpenAI 官方 Image API 对 `gpt-image-2` 返回 base64 图片；后端解码为 PNG 后本地保存。

## 官方契约

- Image generation guide: <https://developers.openai.com/api/docs/guides/image-generation>
- Image API reference: <https://developers.openai.com/api/reference/resources/images/methods/generate>
