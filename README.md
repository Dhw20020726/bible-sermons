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

## 讲道文档中的锚点跳转写法

项目的 `anchor-auto` 插件会在“经文摘录 / 讲道正文”两个板块间生成互跳的锚点，作者只需按需要选择下列写法：

### 1. 完全自动（推荐）
只写三级标题即可，插件会在标题与后续内容之间自动插入跳转按钮，无需任何额外标签。  
示例（`docs/old-testament/创世记/创世记2.7-14.md` 中的经文摘录部分）：
```markdown
### 创世记 2:7
[[bible passage="创世记 2:7"]]
```

### 2. 禁用自动插入
若某个标题不想出现跳转，在标题下方立即写一行 `<AnchorAutoSkip />`：
```markdown
### 创世记 2:7
<AnchorAutoSkip />
[[bible passage="创世记 2:7"]]
```

### 3. 手动放置跳转
如果需要自定义标签位置或文案，可以手动写 `<AnchorJump>`（或 `<AnchorAuto>`，它会被转换为 `<AnchorJump>`）。常用属性：
- `slug`：锚点 slug；不填时自动使用当前标题的 slug（如“创世记 2:7”会生成 `创世记-2-7`）。
- `mode`：`sermon` 表示当前在讲道正文区，`excerpt` 表示经文摘录区（决定跳转目标前缀）。
- `to`：跳转目标锚点（通常由 `mode` 自动拼出，不必填写；仅在特殊需要时手动覆盖）。
- `label`：按钮文案（默认“→ 讲道”或“→ 经文”）。

示例（在讲道正文区手动放置跳转按钮，指向对应经文摘录）：
```markdown
### 创世记 2:7
<AnchorJump slug="创世记-2-7" mode="sermon" label="→ 经文" />
正文内容……
```
若希望借助自动属性生成 `<AnchorJump>`，也可写：
```markdown
### 创世记 2:7
<AnchorAuto mode="sermon" label="→ 经文" />
正文内容……
```
（`slug` 省略时自动取当前标题的 slug）

## 圣经经文资源

- 《圣经·新标点和合本（简体中文）》PDF 下载  
  https://ebible.org/pdf/cmn-cu89s/
