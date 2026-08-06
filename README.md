# Tasks custom date

一个精简的 Obsidian 插件：在新建或编辑任务时自动写入“添加时间”，任务完成时写入/删除“完成时间”，任务取消时写入/删除“取消时间”。

## 功能

- 新建任务时自动写入添加时间；编辑缺少添加时间的任务时自动补写，已存在则不覆盖
- 任务完成时写入完成时间，取消完成时删除完成时间
- 取消状态自动写入/删除取消时间
- 支持两种字段格式：Dataview（`[created:: ...]`、`[completion:: ...]`、`[cancelled:: ...]`）和 Emoji（`➕ ...`、`✅ ...`、`❌ ...`）
- 时间格式可选：`YYYY-MM-DDTHH:mm:ssZ`、`YYYY-MM-DD HH:mm`、`YYYY-MM-DD`，或自定义 moment 格式
- 输入预设触发字符（默认空格）时弹出创建时间建议
- 提供“插入创建时间”命令，可在任务行快速插入创建时间
- 多语言界面：中文、English、Русский、Українська、Беларуская

## 安装

1. 下载最新 Release 中的 `main.js`、`manifest.json`、`styles.css` 三个文件
2. 放入库的 `.obsidian/plugins/obsidian-tasks-custom-date-plugin/` 目录
3. 在 Obsidian 设置 → 第三方插件中启用 “Tasks custom date”

## 使用

- 命令面板中的 `Create or edit task`：新建或编辑任务
- 命令面板中的 `Toggle task done`：切换任务完成状态
- 命令面板中的 `Insert created time`：在任务行插入创建时间
- 在 Live Preview 或阅读模式点击任务勾选框，会自动维护完成/取消时间

## 开发

```bash
npm install
npm test
npm run build
```

## 来源

本插件派生自开源项目 [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks)，只保留了“任务时间戳自动写入/删除”相关功能，并在此基础上增加了时间格式配置、创建时间建议和插入命令。

上游项目采用 MIT 许可证，本插件同样保留 [LICENSE](LICENSE)。
