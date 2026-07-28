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

在 [Releases](https://github.com/HerrDanke/AI-Comic-Asset-Management/releases) 页面下载最新版本的安装包：

- **MSI 安装包**：`AIComicCharacterDB_x.x.x_x64.msi` - 双击安装
- **NSIS 安装包**：`AIComicCharacterDB_x.x.x_x64-setup.exe` - 双击安装

安装后从开始菜单或桌面快捷方式启动应用。

> **注意**：首次运行需要安装 [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)（Windows 11 已自带）。

### 方式 2：从源码构建

#### 环境要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (通过 rustup 安装)
- [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (Windows 11 已自带)
- [WiX Toolset](https://wixtoolset.org/) v3.14+ (仅构建 MSI 安装包需要)

#### 构建步骤

```bash
# 1. 克隆仓库
git clone https://github.com/HerrDanke/AI-Comic-Asset-Management.git
cd ai-comic-character-db

# 2. 安装依赖
npm install

# 3. 开发模式（热更新）
npm run tauri:dev

# 4. 构建生产版本
npm run tauri:build
```

构建完成后，安装包位于 `src-tauri/target/release/bundle/` 目录下：
- `msi/AIComicCharacterDB_x.x.x_x64_en-US.msi` - MSI 安装包
- `nsis/AIComicCharacterDB_x.x.x_x64-setup.exe` - NSIS 安装包

## 项目结构

```
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
```

## 使用说明

1. **创建项目** — 首次使用点击"新建项目"，设置项目名称和存储路径
2. **添加角色** — 点击角色列表的"+ 添加"按钮创建新角色
3. **编辑角色** — 点击角色卡片进入编辑模式，修改属性
4. **排序角色** — 按住角色卡片拖动到目标位置，自动保存顺序
5. **管理图片** — 在图片画廊中上传、查看角色图片
6. **版本控制** — 底部面板查看版本历史，支持回滚
7. **导入导出** — 通过顶部菜单将项目导出为文件（支持作为新项目导入或合并到现有项目）

## 数据存储

- 项目数据存储在用户主目录 `~/AIComicCharacterDB/projects/` 中
- 每个项目独立文件夹，包含角色数据和图片资源
- 支持项目间的导入导出，合并时自动重命名重复角色

## 版本历史

[历史版本/优化变更](https://github.com/HerrDanke/AI-Comic-Asset-Management/tree/master/OPTIMIZATION)

## License

MIT
