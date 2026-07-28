# Lumora 后端开发与联调交接

## 项目边界

- 前端：`lumora-image-studio`
- 后端：同级独立项目 `../lumora-image-studio-backend`
- 前端构建只执行 Vue/Vite，不包含 Rust/Cargo。
- 前端 `src/services` 只保留 HTTP 客户端；上游生图请求、密钥使用、数据持久化全部由 Rust 后端负责。

## 技术方案

- Rust + Axum
- SQLite：`lumora-image-studio-backend/data/lumora.db`
- 本地图片：`lumora-image-studio-backend/data/images/`
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

## 应用接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/health` | 当前用户是否已配置调用方 |
| `GET` | `/api/session` | 当前登录用户 |
| `POST` | `/api/auth/register` | 注册 |
| `POST` | `/api/auth/login` | 登录 |
| `POST` | `/api/auth/logout` | 退出 |
| `GET` | `/api/announcements` | 公告列表 |
| `GET/POST` | `/api/api-keys` | 对外 API Key 列表/创建 |
| `DELETE` | `/api/api-keys/:id` | 废弃 API Key |
| `GET/POST` | `/api/providers` | 调用方列表/创建 |
| `PUT` | `/api/providers/:id/activate` | 选择当前调用方 |
| `DELETE` | `/api/providers/:id` | 删除调用方 |
| `GET` | `/api/usage` | 用量与调用记录 |
| `GET/DELETE` | `/api/images` | 图片列表/全部删除 |
| `POST` | `/api/images/generate` | 生图并保存到服务器本地 |
| `DELETE` | `/api/images/:id` | 删除图片及本地文件 |
| `GET` | `/uploads/:file` | 读取本地图片 |

## 前端联调范围

- 登录、注册、退出改为后端会话。
- 用户资料、积分、公告改为 SQLite 数据。
- API Key 创建与废弃改为后端接口。
- 新增调用方配置、选择和删除界面。
- 生图改由 Rust 调用当前启用调用方，成功后写 SQLite 和本地图片目录。
- 画廊加载、删除和清空改为后端接口。
- API 概览与调用记录改为后端统计。

## 执行计划与状态

- [x] 梳理前端状态、交互和现有接口
- [x] 创建独立 Rust 项目
- [x] 建立 SQLite 表和本地图片目录
- [x] 实现认证、公告、API Key、调用方、用量、图片接口主体
- [x] 完成前端调用方管理与用量页面对接
- [x] 实现并验证 Lumora 对外 `/v1` API Key 调用入口
- [x] 完成 Rust 编译检查与测试（10 项测试通过，格式检查通过）
- [ ] 完成 Vue 类型检查与生产构建
- [ ] 启动前后端，执行注册、登录、调用方切换、生图、图片读取/删除联调
- [ ] 回填最终联调结果

## 联调顺序

1. 启动后端：在 `lumora-image-studio-backend` 执行 `cargo run`。
2. 启动前端：在 `lumora-image-studio` 执行 `pnpm dev`。
3. 注册测试用户并验证 HttpOnly Cookie 会话。
4. 新建两个本地 Mock 调用方，切换启用项并验证 `/api/health`。
5. 调用 `/api/images/generate`，验证请求发送给当前调用方。
6. 验证 PNG 写入 `data/images`、SQLite 元数据、积分扣减和用量日志。
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

- Rust 编译、测试与格式检查已通过。
- Vue 生产构建当前被 `AuthModal/index.vue` 中未使用的 `ArrowRight` 导入阻塞。
- 不在仓库、日志或文档中写入真实凭证。
- OpenAI 官方 Image API 对 `gpt-image-2` 返回 base64 图片；后端解码为 PNG 后本地保存。
- 当前工作未结束，以本文件检查项和最终联调结果为准。

## 官方契约

- Image generation guide: <https://developers.openai.com/api/docs/guides/image-generation>
- Image API reference: <https://developers.openai.com/api/reference/resources/images/methods/generate>
