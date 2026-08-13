# CLAUDE.md

本仓库即 Obsidian 插件「Tasks custom date」本身（路径 `.obsidian/plugins/tasks-custom-date/`，Obsidian 按 `manifest.json` 的 `id` 从该目录加载）。功能：任务勾选/切换状态时自动写入创建（created）、完成（completion）、取消（cancelled）时间戳，支持自定义状态转换（customStates）与时间格式模板（dataview `[created:: ...]`、emoji、自定义 moment 格式）。

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run build` | esbuild 打包 `src/main.ts` → `main.js`（改 src/ 后必须重跑） |
| `npm test` | jest + ts-jest 跑 tests/，无需构建 |
| `npm run reload` / `npm run restart` | obsidian CLI 热重载 / 重启 Obsidian |
| `npm run plugin:reload` | 重载本插件（`obsidian plugin:reload id=tasks-custom-date`） |

## 代码结构

- `src/main.ts` — 入口：注册命令 edit-task、toggle-done、insert-created-date。命令均为 `editorCallback`，只在编辑模式（source / live preview）下触发，reading 模式静默无效
- `src/taskLine.ts` — 任务行解析与改写：parseTaskLine、matchLastEmojiField、toggleTaskLine、buildEditedLine
- `src/stateEngine.ts` — 状态转换引擎：normalizeTaskLine、removeFieldFromBody（时间字段去重/重排）
- `src/suggestion.ts` — 输入触发字符（suggestTrigger，默认空格）弹出「创建时间」建议文本
- `src/livePreviewExtension.ts` — CodeMirror ViewPlugin（live preview 实时渲染）。返回类型须标注 `import type { Extension } from '@codemirror/state'`（devDep），否则 tsc 报类型不兼容
- `src/readingModeHandler.ts` — 阅读模式下的任务行处理
- `src/settings.ts` / `settingsTab.ts` / `customStateModal.ts` / `createOrEditModal.ts` — 设置面板与弹窗
- `src/i18n/` — 中英文案
- `tests/` — taskLine / stateEngine / suggestion / i18n 的 jest 用例

## 关键约定与坑

### 发布新版本

1. 同步 bump 三处版本号：`manifest.json`、`package.json`、`versions.json`（版本 → 最低 Obsidian 版本）。`main.js` 是打包产物、不含版本号，无需改动
2. `npm run build` → commit → tag → `gh release create <tag> main.js manifest.json styles.css -R ssjy1919/obsidian-tasks-custom-date`。**必须带 `-R`**，gh 默认仓库会解析到 upstream（obsidian-tasks-group/obsidian-tasks）

### 字段检测不能锚定行尾

任务行里的时间字段可能出现在**行内任意位置**（后面可跟注释/标签/其他字段）。所有「字段是否已存在」的检测——stateEngine 的 `fieldRemovalRegex`、taskLine 的 dataview 正则与 `matchLastEmojiField`——都不得用 `$` 锚定行尾，否则字段后有文本时误判为不存在，导致重复插入。回归测试在 tests/ 的 taskLine / stateEngine / suggestion 三个文件中。

字段在行内被识别后会统一「搬」到行尾（字段后的文本保留在描述中）——这是插件既有设计，属预期归一化行为。

### git

- commit message 用中文（可保留 `fix:` / `feat:` / `chore:` 等 type 前缀）
- `.gitignore` 忽略 `data.json`（用户运行时设置，勿提交）、`node_modules/`、`.claude/`

### 在本机 Obsidian 中冒烟验证

以下流程依赖本机安装的 obsidian-local-rest-api 插件，端口为其默认值；若本地设置里改过端口，以实际配置为准：

- 本地 REST API：默认 `http://127.0.0.1:27123/`（HTTPS 为 27124）。API key 在 `.obsidian/plugins/obsidian-local-rest-api/data.json`。**运行时读取，绝不硬编码**进命令或代码
- 执行命令前确认当前文件处于编辑模式；reading 模式命令静默无效，可先执行 `markdown:toggle-preview` 切换
- 新建测试文件注意重名（Obsidian 会以 `xxx 1.md` 规避冲突），用 active_file 接口确认实际文件名
