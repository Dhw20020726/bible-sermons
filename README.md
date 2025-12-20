# bible-sermons

本项目用于“按圣经卷书系统性分享神的话语与教会讲道”，以 Docusaurus 构建静态站点，适合在 GitHub Pages 上部署与维护。

## 项目目的

- 以中文卷书目录整理讲道与灵修内容
- 按旧约与新约系统性阅读
- 让经文、讲道与默想可以持续积累与分享

## 如何维护讲道内容

1. 在 `docs/` 中选择对应卷书文件夹，例如 `docs/old-testament/创世记/`。
2. 新增 Markdown 文件，例如 `sermon-01.md`。
3. 文件中需包含 YAML Front Matter，例如：

```markdown
---
title: 讲道标题
---

内容正文...
```

4. 新增文件后，请在 `sidebars.js` 中为对应卷书添加页面条目，确保左侧导航与目录一致。

## 使用 Docusaurus + GitHub Pages 部署

- 本站点使用 Docusaurus（JavaScript）构建
- 部署路径：`https://<GITHUB_USERNAME>.github.io/bible-sermons`
  - 提示：请在本地运行前设置环境变量 `GITHUB_USERNAME`（例如 `GITHUB_USERNAME=yourname`），
    以便生成正确的 `url` 与 `organizationName` 配置。

常用命令：

```bash
npm install
npm run start
npm run build
npm run deploy
```
