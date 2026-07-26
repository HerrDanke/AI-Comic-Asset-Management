# AI漫剧角色库 (AIComicCharacterDB)

基于 Tauri 2.x 构建的桌面端 AI 漫剧角色资产管理系统，专为漫剧创作团队设计。

## 功能特性

- **项目管理** — 创建、导入、导出项目文件
- **角色管理** — 添加、编辑、删除角色，支持搜索筛选
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
| 打包格式 | NSIS / MSI (Windows) |

## 快速开始

### 环境要求

- Node.js 18+
- Rust (通过 rustup 安装)
- WebView2 Runtime (Windows 自带)

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri:dev
```

### 构建生产版本

```bash
npm run tauri:build
```

### 构建并复制安装包到项目根目录

```bash
npm run tauri:build:copy
```

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
4. **管理图片** — 在图片画廊中上传、查看角色图片
5. **版本控制** — 底部面板查看版本历史，支持回滚
6. **导入导出** — 通过顶部菜单将项目导出为文件

## 数据存储

- 项目数据存储在用户选择的目录中
- 每个项目独立文件夹，包含角色数据和图片资源
- 支持项目间的导入导出

## 版本历史

- **v1.0.0** — 初始版本，包含基础角色管理、图片画廊、版本控制功能

## License

MIT
