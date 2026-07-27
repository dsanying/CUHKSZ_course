# 港中深课程资料下载页

这是部署到 GitHub Pages 的前端站点。GitHub 只保存站点源码、索引清单和说明；课程资料文件存储在普通蓝奏云。

下载按钮通过仓库内 `worker/` 的解析服务实时获取蓝奏云临时地址，并以附件响应流式传回文件。因此浏览器会直接开始下载，不再打开蓝奏云分享页。

常用命令：

```bash
npm run dev
npm run build
npm run generate:manifest
npm run sync:lanzou:classic
```

下载页只读取 `site/public/lanzou-manifest.json` 中的蓝奏云普通版链接。
GitHub Actions 通过仓库变量 `DOWNLOAD_RESOLVER_URL` 注入解析服务地址；不再生成 GitHub raw、jsDelivr 或 Release 压缩包下载地址。

## 普通蓝奏云同步

本地 Firefox 登录 `up.woozooo.com` 后，可以运行：

```bash
npm run sync:lanzou:classic
```

脚本会读取 Firefox 登录态，查找或创建 `CUHKSZ_sourse` 根文件夹，按课程和资料分类同步文件，并写入 `site/public/lanzou-manifest.json`。

可用环境变量：

- `LANZOU_CLASSIC_COOKIE`：手动传入普通蓝奏云 Cookie。
- `LANZOU_CLASSIC_ROOT_FOLDER_ID`：复用已存在的根文件夹 ID。
- `LANZOU_CLASSIC_ROOT_FOLDER_NAME`：根文件夹名，默认 `CUHKSZ_sourse`。
- `LANZOU_UPLOAD_LIMIT`：只同步前 N 个文件，便于测试。
- `LANZOU_UPLOAD_PATH`：只同步一个精确资源路径，并在保留其余当前清单记录的同时更新该条目。
- `LANZOU_UPLOAD_CHANGED=true`：只同步当前清单尚未记录的新路径，并清理已改名或已删除的旧路径。
- `LANZOU_CLASSIC_SPLIT_SIZE`：超限文件分片大小，默认约 `95M`。

普通蓝奏云免费账号的后台直链接口返回“未开放”，因此清单只保存稳定分享链接；真正的临时下载地址在用户点击时由解析服务获取。

整理 Blackboard 下载内容时，先运行只读审计，再显式执行删除和重命名：

```bash
npm run prune:resources
npm run prune:resources:apply
npm run plan:renames
npm run apply:renames
```

筛选与命名标准以仓库根目录的 `README.md` 为准。删除计划会写入本地审计目录，便于执行前复核。
