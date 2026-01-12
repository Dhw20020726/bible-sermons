# bible-sermons

本项目用 Docusaurus 构建圣经讲道站点，内容按旧约/新约与卷书目录组织，适合 GitHub Pages 部署。

## 内容维护

在 `docs/` 中选择对应卷书目录（如 `docs/old-testament/创世记/`），新增 Markdown 文件并填写 Front Matter：

```markdown
---
title: 讲道标题
---
正文内容...
```

## 站点部署

GitHub Pages 部署地址：`https://Dhw20020726.github.io/bible-sermons`。

## 经文占位符与多节标记

在 Markdown 中使用 `[[bible passage="卷书 章:节"]]` 插入经文，例如：

```markdown
[[bible passage="创世记 2:7"]]
```

经文内容来自 `static/bible/<版本>/` 的章节文本文件，默认版本为 `cmn-cu89s_readaloud`。当某一行同时代表多节时，可在**行首**写入标记：

```text
[[verses=2]]这行文本代表连续两节，会同时映射到 27 与 28。
```

也支持 `[[span=2]]`，含义相同。标记后的后续节号会按跨度递增。

## 索引与搜索

Algolia 索引由 `scripts/algoliaIndex.js` 生成/上传，构建时会展开 `[[bible ...]]` 占位符以便搜索。
