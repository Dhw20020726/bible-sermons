# bible-sermons

基于 [Docusaurus 3.x](https://docusaurus.io/) 构建的圣经讲道站点，内容按旧约/新约与卷书目录组织，部署在 GitHub Pages。

在线地址：`https://dhw20020726.github.io/bible-sermons`

---

## 环境搭建

```bash
# 要求 Node.js 18+
node -v

# 安装依赖
npm install

# 启动开发服务器
npm start

# 生产构建
npm build
```

### 搜索功能（可选）

站点集成了 Algolia DocSearch。如需在本地启用搜索，复制 `.env.example` 为 `.env` 并填入 Algolia 凭证：

```bash
cp .env.example .env
# 编辑 .env 填入实际的 Algolia API Key
```

生成并上传搜索索引：

```bash
npm run index:generate   # 生成索引到 build/algolia-index.json
npm run index:upload     # 上传索引到 Algolia
npm run index:all        # 生成 + 上传
```

---

## 项目结构

```
bible-sermons/
├── lib/                    # 共享工具库（经文解析、slug 生成）
│   ├── bible-parser.js     #   解析 "创世记 2:7-9" → 结构化对象
│   └── slug.js             #   中文标题 → URL 友好 slug
├── plugins/                # Docusaurus remark 插件（Markdown 处理）
│   ├── auto-bible/         #   依据标题自动插入经文
│   ├── bible-embed/        #   [[bible passage="..."]] → 真实经文 HTML
│   └── heading-anchors/    #   为所有标题添加稳定 HTML id
├── scripts/                # 构建脚本
│   ├── algoliaIndex.js     #   Algolia 搜索索引生成/上传
│   ├── test-bible-placeholders.js  # 经文数据完整性测试
│   └── utils/env.js        #   Algolia .env 配置加载
├── src/                    # React 前端代码
│   ├── components/         #   可复用组件
│   ├── pages/              #   页面（首页、/docs 重定向）
│   ├── theme/              #   Docusaurus 主题覆写
│   ├── utils/              #   前端工具函数
│   └── css/                #   自定义样式
├── docs/                   # 讲道内容（Markdown）
│   ├── old-testament/      #   旧约 39 卷
│   └── new-testament/      #   新约 27 卷
├── static/bible/           # 圣经经文文本数据
├── docusaurus.config.js    # Docusaurus 主配置
└── sidebars.js             # 侧边栏自动生成配置
```

---

## 内容维护

在 `docs/` 中选择对应卷书目录（如 `docs/old-testament/创世记/`），新增 Markdown 文件并填写 Front Matter：

```markdown
---
title: 创世记 2:7-14
---

*以下内容整理自创世记 2:7-14 的讲道。*

## 创世记 2:7

神与我们的关系……（经文后紧跟解释）

## 创世记 2:8-9

神只想为人类做最好的事……
```

每段结构为：`## 经文标题` → 解释。标题本身即经文引用，构建时会**自动**在标题后插入对应经文，无需手写占位符。可选的「引言」段仅含解释、无经文；若某段暂无解释，也可只保留标题。

侧边栏会**自动扫描** `docs/` 目录，按预设的圣经卷书顺序生成导航。

---

## 经文自动插入

正文中的每个 `##` 二级标题即为经文引用，构建时 `auto-bible` 插件会自动在其后插入对应经文，无需手写占位符。

支持的标题格式：

- 单段引用：`## 创世记 2:7`
- 范围引用：`## 创世记 2:8-9`
- 多段引用（顿号分隔）：`## 创世记 15:6、希伯来书 11:1`
- 省略书名的后续引用：`## 提摩太后书 4:16、1:15`（`1:15` 继承前一段书名）
- 非经文标题（如 `## 引言`）：自动跳过，不插入经文

经文内容来自 `static/bible/<版本>/` 的章节文本文件，默认版本为 `cmn-cu89s_readaloud`。

如需在标题之外（如解释段落中）手动引用经文，仍可使用 `[[bible passage="创世记 2:7"]]` 占位符。

### 多节标记

当一行文本同时代表多节时（如诗歌段落），在行首写入标记：

```text
[[verses=2]]这行文本代表连续两节，会同时映射到 27 与 28。
```

也支持 `[[span=2]]`，含义相同。后续节号会按跨度自动递增。

---

## 站点部署

GitHub Actions 会在 push 到 `main` 分支时自动构建并部署到 GitHub Pages。

手动部署：

```bash
npm build
npm run index:all   # 同时更新 Algolia 搜索索引
```
