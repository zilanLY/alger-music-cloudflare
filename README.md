# Alger Music Cloudflare

将 [AlgerMusicPlayer](https://github.com/algerkong/AlgerMusicPlayer) 适配为纯 Web 应用，部署到 Cloudflare Pages + Workers。

## 架构

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Cloudflare     │     │  Adapter Worker       │     │  Meting API         │
│  Pages (前端)    │────▶│  (API 翻译层)         │────▶│  (网易云数据源)      │
│  Vue.js SPA     │     │  NeteaseApi → Meting  │     │  Serverless         │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
```

- **前端**: AlgerMusicPlayer 的 renderer 部分，去除 Electron 依赖，部署到 Cloudflare Pages
- **Adapter Worker**: 将 NeteaseCloudMusicApi 格式的请求翻译为 Meting API 格式
- **Meting API**: 使用 [Meting-API-Serverless](https://github.com/lxyoucan/Meting-API-Serverless) 作为网易云数据源

## 部署步骤

### 1. 部署 Meting-API-Serverless

1. Fork [Meting-API-Serverless](https://github.com/lxyoucan/Meting-API-Serverless)
2. 在 Cloudflare Workers 中创建新 Worker，连接你的 fork 仓库
3. 设置环境变量：
   - `TOKEN`: 自定义密钥（用于 HMAC 认证）
4. 部署后记下你的 Meting API URL（如 `https://meting-api.xxx.workers.dev`）

### 2. 部署 Adapter Worker

1. 进入 `worker/` 目录
2. 安装依赖：`npm install`
3. 修改 `wrangler.toml` 中的环境变量：
   - `METING_API_URL`: 你的 Meting API 地址
   - `METING_TOKEN`: 你在步骤1中设置的 TOKEN
4. 部署：`npx wrangler deploy`
5. 记下你的 Adapter Worker URL（如 `https://alger-music-adapter.xxx.workers.dev`）

### 3. 部署前端到 Cloudflare Pages

1. Fork 本仓库
2. 在 Cloudflare Pages 中创建新项目，连接你的 fork
3. 配置构建：
   - **构建命令**: `cd web && npm install && npm run build`
   - **构建输出目录**: `web/dist`
4. 设置环境变量：
   - `VITE_API`: 你的 Adapter Worker URL + `/api`（如 `https://alger-music-adapter.xxx.workers.dev/api`）
5. 部署

## 功能支持

| 功能 | 支持情况 | 说明 |
|------|---------|------|
| 搜索音乐 | ✅ | 通过 Meting API |
| 播放音乐 | ✅ | 通过 Meting API |
| 歌词显示 | ✅ | 通过 Meting API |
| 歌单详情 | ✅ | 通过 Meting API |
| 专辑详情 | ✅ | 通过 Meting API |
| 歌手详情 | ✅ | 通过 Meting API |
| 账号登录 | ❌ | Web 模式不支持 |
| 用户歌单 | ❌ | Web 模式不支持 |
| 每日推荐 | ❌ | Web 模式不支持 |
| 本地音乐 | ❌ | Web 模式不支持 |
| 下载功能 | ❌ | Web 模式不支持 |
| 桌面歌词 | ❌ | Web 模式不支持 |
| 迷你模式 | ❌ | Electron 专属 |

## 本地开发

### 前端

```bash
cd web
npm install
# 创建 .env.local 文件，设置 VITE_API 指向你的 adapter 或 Meting API
npm run dev
```

### Adapter Worker

```bash
cd worker
npm install
npx wrangler dev
```

## 致谢

- [AlgerMusicPlayer](https://github.com/algerkong/AlgerMusicPlayer) - 原始项目
- [Meting-API-Serverless](https://github.com/lxyoucan/Meting-API-Serverless) - 网易云 API 数据源
- [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) - API 格式参考

## License

MIT
