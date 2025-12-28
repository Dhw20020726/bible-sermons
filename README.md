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

## 讲道文档中的锚点跳转写法（最佳实践）

`anchor-auto` 插件会为“经文摘录 / 讲道正文”两栏生成互跳链接。常用场景与写法如下：

1) **默认自动插入（最简便）**  
   只写三级标题，插件会在标题下方自动插入跳转按钮。无需额外标签。  
   ```markdown
   ### 创世记 2:7
   [[bible passage="创世记 2:7"]]
   ```

2) **禁止自动插入**  
   在该三级标题下一行写 `<AnchorAutoSkip />`，插件会移除此标记并跳过自动生成。  
   如果不想写 JSX，也可以用 HTML 注释 `<!--AnchorAutoSkip -->` 达到相同效果。  
   ```markdown
   ### 创世记 2:7
   <AnchorAutoSkip />
   <!--AnchorAutoSkip -->
   [[bible passage="创世记 2:7"]]
   ```

3) **手动放置跳转（需要自定义文案/位置时）**  
   - 用 `<AnchorJump>` 直接写入，需提供 `id` 与 `to`（指向对端锚点），可自定义 `label`。  
     ```markdown
     ### 创世记 2:7
     <AnchorJump id="sermon-创世记-2-7" to="excerpt-创世记-2-7" label="返回经文" />
     正文内容……
     ```
   - 如果只想写最少字段，可用 `<AnchorAuto>`（它会被转成 `<AnchorJump>`）：  
     - `slug`：不写则自动用标题生成（如“创世记 2:7”→`创世记-2-7`）。  
     - `mode`：`sermon` 表示当前在讲道正文，会跳到经文；`excerpt` 反之。默认根据二级标题自动推断。  
     - `label`：自定义按钮文本；不写则用默认“→ 讲道 / → 经文”，若标签内写了子文本且没给 `label`，会保留子文本。  
     示例：  
     ```markdown
     ### 创世记 2:7
     <AnchorAuto mode="sermon" label="跳到经文" />
     正文内容……
     ```

**提示**  
- 若你已手写 `<AnchorJump>` 或 `<AnchorAuto>`，同一三级标题下的自动插入会被跳过，使用你的标签。  
- 默认生成的 `id`/`to` 形如 `sermon-创世记-2-7` 与 `excerpt-创世记-2-7`，可按需手写覆盖。  

## 圣经经文资源

- 《圣经·新标点和合本（简体中文）》PDF 下载  
  https://ebible.org/pdf/cmn-cu89s/
