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

## 使用 Docusaurus + GitHub Pages 部署

- 本站点使用 Docusaurus（JavaScript）构建
- 部署路径：`https://Dhw20020726.github.io/bible-sermons`

常用命令：

```bash
npm install
npm run start
npm run build
npm run deploy
```

## 讲道文档中的跳转标签说明

以下标签由项目内的 `anchor-auto` 插件处理，用于在“经文摘录/讲道正文”两栏之间跳转：

- **自动插入（默认行为）**：三级标题（`### 标题`）后会自动生成 `<AnchorJump>` 跳转链接，位置在标题和后续内容之间。
- **手动控制**：
  - 如果你已经在标题后手动写了 `<AnchorJump ...>`，插件会检测到并不会再自动插入。
  - 如需阻止自动插入，可在该三级标题后立即写一行 `<AnchorAutoSkip />`，插件会移除这个标记且不再自动生成跳转链接。

## 圣经经文资源

- 《圣经·新标点和合本（简体中文）》PDF 下载  
  https://ebible.org/pdf/cmn-cu89s/
