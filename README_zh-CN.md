# Tasks custom date 中文说明

[English](README.md)

一个精简的 Obsidian 插件：在任务进入不同状态时自动写入时间字段，并支持自定义中间状态流转、格式模板、统一时间格式和多语言。

## 功能

### 任务接管策略

- 设置页“接管触发标签/文字”默认值为 `#custom`。
- 只有任务内容包含该标签/文字时，插件才会自动写入/删除时间字段并参与状态流转。
- 清空该输入框表示接管所有任务（全局模式）。

### 状态流转引擎

- 固定基础状态：未完成 `[ ]`、已完成 `[x]`。
- 可以新增自定义中间状态，每个状态定义名称和图标字符；列表顺序决定点击勾选框时的流转顺序。
- 流转范围：
  - 默认“仅指定标签/文字的任务流转”：只有包含“流转触发标签/文字”的任务按状态序列循环流转。
  - “所有任务都流转”：所有任务按状态序列循环流转。
  - “不启用流转”：点击只在未完成和已完成之间切换，中间状态不参与流转。
- “流转触发标签/文字”与“接管触发标签/文字”相互独立。
- 未配置的状态图标（如 `[o]`）点击后会回到未完成 `[ ]`。
- 状态行说明会显示点击前后的流转路径，例如 `[x]         ( ◔ ω◔) ⇨         [/]`。

### 字段格式与写入

- 每个状态对应一个格式模板；模板中的 `{{time}}` 是时间占位符，进入该状态时会替换为当前时间。
- 模板里不包含 `{{time}}` 时，会严格按照模板文本写入，不会自动附加时间。
- 所有时间字段共用“时间格式”设置：`YYYY-MM-DDTHH:mm:ss`、`YYYY-MM-DD HH:mm`、`YYYY-MM-DD` 或自定义 moment.js 格式。
- 自定义格式输入框下方会实时显示当前预设的实际时间，并提供 [moment.js 格式化说明](https://momentjs.com/docs/#/displaying/) 链接。
- “始终写入添加时间”开关：开启后，点击任意状态的任务时，如果缺少添加时间会自动补写；已有添加时间不会被覆盖。

示例：

- ` [created:: {{time}}]` → ` [created:: 2026-08-08T04:15:04]`
- ` [completion:: {{time}}]` → ` [completion:: 2026-08-08T04:15:04]`
- ` [cancelled:: {{time}}]` → ` [cancelled:: 2026-08-08T04:15:04]`

### 创建时间建议

- 在任务行输入“建议触发字符”（默认空格）后，会弹出创建时间建议。
- 建议内容使用未完成状态的格式模板生成。

## 命令

- `Create or edit task`：新建或编辑任务
- `Toggle task done`：切换任务状态
- `Insert created time`：在任务行插入创建时间字段

## 安装

1. 下载最新 Release 中的 `main.js`、`manifest.json`、`styles.css` 三个文件。
2. 放入库的 `.obsidian/plugins/tasks-custom-date/` 目录。
3. 在 Obsidian 设置 → 第三方插件中启用 “Tasks custom date”。

## 开发

```bash
npm install
npm test
npm run build
npm run plugin:reload
npm run reload
```

## 来源

本插件派生自开源项目 [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks)，保留了任务时间写入/删除相关思路，并实现了自定义状态流转、格式模板、统一时间格式和多语言。
上游项目采用 MIT 许可证，本插件同样保留 [LICENSE](LICENSE)。
