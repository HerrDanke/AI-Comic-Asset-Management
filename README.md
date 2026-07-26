# AI漫剧角色库 (AIComicCharacterDB)

基于 Tauri 2.x 构建的桌面端 AI 漫剧角色资产管理系统，专为漫剧创作团队设计。

## 功能特性

- **项目管理** — 创建、导入、导出项目文件
- **角色管理** — 添加、编辑、删除角色，支持搜索筛选
- **角色排序** — 拖拽角色卡片调整顺序，自动保存
- **属性编辑** — 角色名称、描述、特性等多维度信息管理
- **图片画廊** — 角色图片资源管理
- **版本历史** — 自动保存版本快照，支持回溯
- **数据持久化** — 本地文件系统存储，安全可靠
- **响应式布局** — 适配不同窗口尺寸

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Tailwind CSS |
| 状态管理 | Zustand |
| 构建工具 | Vite 5 |
| 桌面框架 | Tauri 2.x (Rust) |
| 打包格式 | MSI / NSIS (Windows) |

## 快速开始

### 方式 1：使用安装包（推荐）

在 [Releases]([Releases · HerrDanke/AI-Comic-Asset-Management](https://github.com/HerrDanke/AI-Comic-Asset-Management/releases)) 页面下载最新版本的安装包：

- **MSI 安装包**：AIComicCharacterDB_x.x.x_x64.msi - 双击安装
- **NSIS 安装包**：AIComicCharacterDB_x.x.x_x64-setup.exe - 双击安装

安装后从开始菜单或桌面快捷方式启动应用。

> **注意**：首次运行需要安装 [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)（Windows 11 已自带）。

### 方式 2：从源码构建

#### 环境要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (通过 rustup 安装)
- [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (Windows 11 已自带)
- [WiX Toolset](https://wixtoolset.org/) v3.14+ (仅构建 MSI 安装包需要)

#### 构建步骤

`ash

# 1. 克隆仓库
git clone https://github.com/你的用户名/ai-comic-character-db.git
cd ai-comic-character-db

# 2. 安装依赖
npm install

# 3. 开发模式（热更新）
npm run tauri:dev

# 4. 构建生产版本
npm run tauri:build
`

构建完成后，安装包位于 src-tauri/target/release/bundle/ 目录下：
- msi/AIComicCharacterDB_x.x.x_x64_en-US.msi - MSI 安装包
- 
sis/AIComicCharacterDB_x.x.x_x64-setup.exe - NSIS 安装包

## 项目结构

`
ai-comic-character-db/
├── src/                    # React 前端源码
│   ├── components/         # UI 组件
│   ├── stores/             # Zustand 状态管理
│   ├── types/              # TypeScript 类型定义
│   └── utils/              # 工具函数
├── src-tauri/              # Tauri Rust 后端
│   ├── src/                # Rust 源码
│   └── icons/              # 应用图标
├── scripts/                # 构建脚本
├── package.json
└── vite.config.ts
`

## 使用说明

1. **创建项目** — 首次使用点击"新建项目"，设置项目名称和存储路径
2. **添加角色** — 点击角色列表的"+ 添加"按钮创建新角色
3. **编辑角色** — 点击角色卡片进入编辑模式，修改属性
4. **排序角色** — 按住角色卡片拖动到目标位置，自动保存顺序
5. **管理图片** — 在图片画廊中上传、查看角色图片
6. **版本控制** — 底部面板查看版本历史，支持回滚
7. **导入导出** — 通过顶部菜单将项目导出为文件（支持作为新项目导入或合并到现有项目）

## 数据存储

- 项目数据存储在用户主目录 ~/AIComicCharacterDB/projects/ 中
- 每个项目独立文件夹，包含角色数据和图片资源
- 支持项目间的导入导出，合并时自动重命名重复角色

## 版本历史

### v1.0.2 — 拖拽排序与稳定性优化 (2026-07-26)

**新功能：**
- 🎯 **角色拖拽排序** — 支持拖拽角色卡片调整顺序，CSS transform 实现流畅动画

------



### v1.0.1 — 优化 (2026-07-26)

**核心问题修复：**
- 🔴 **修复双 store 同步机制** — characterStore 与 projectStore 之间的数据同步重构，写盘成功后明确同步回 projectStore，确保数据一致性
- 🔴 **修复关闭窗口数据丢失** — 新增关闭前自动保存机制，脏数据时先保存再关闭

**功能优化：**
- 🚀 **写入队列防止并发竞争** — 所有写入操作通过 Promise 链式队列串行化，避免 JSON 文件并发写入冲突
- 🚀 **导入合并模式实现** — 支持"作为新项目导入"和"合并到现有项目"两种模式，合并时自动检测重名并添加序号后缀
- 🚀 **getImageData 返回 data URL** — Rust 端自动检测图片格式并返回完整的 data:image/...;base64,... 格式，前端无需手动拼接 MIME
- 🚀 **自动保存策略优化** — 新增定时保存（每30秒）和失焦保存（切换应用时），编辑器失焦仅静默保存不再产生冗余版本快照

**变更文件：**
- src/stores/characterStore.ts — 双 store 同步修复
- src/stores/projectStore.ts — 导入合并模式支持 + 角色排序
- src/utils/tauri.ts — 写入队列 + 导入合并 API
- src/App.tsx — 自动保存机制（关闭前/定时/失焦）
- src/components/Topbar.tsx — 导入对话框
- src/components/CharacterList.tsx — 拖拽排序
- src/components/CharacterEditor.tsx — 失焦保存策略调整
- src/components/ImageGallery.tsx — 适配 data URL
- src-tauri/src/commands.rs — 合并导入 + data URL + UUID 颜色生成

---

### v1.0.0 — 初始版本

- 基础角色管理（增删改查、搜索筛选）
- 图片画廊（上传、查看、删除）
- 评论式性格特征编辑
- 版本控制（自动快照 + 手动快照 + 回滚）
- 项目导入导出
- Windows 安装包构建（MSI / NSIS）

## License

MIT