# 蓝奏云直接下载解析器

这个 Cloudflare Worker 只接受 `dsanying.lanzoue.com` 的单文件分享链接。它实时解析蓝奏云移动端下载链路、流式转发文件，并强制返回 `Content-Disposition: attachment`，让浏览器直接开始下载。

```bash
npm ci
npm test
npm run dev
npm run deploy
```

部署后，将完整端点（例如 `https://cuhksz-source-download.example.workers.dev/download`）写入 GitHub Actions 仓库变量 `DOWNLOAD_RESOLVER_URL`。
