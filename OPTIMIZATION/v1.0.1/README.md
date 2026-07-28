### v1.0.1 — 性能优化 (2026-07-26)



**核心问题修复：**

- 🔴 **修复双 store 同步机制** — characterStore 与 projectStore 之间的数据同步重构，写盘成功后明确同步回 projectStore，确保数据一致性
- 🔴 **修复关闭窗口数据丢失** — 新增关闭前自动保存机制，脏数据时先保存再关闭

**功能优化：**

- 🚀 **写入队列防止并发竞争** — 所有写入操作通过 Promise 链式队列串行化，避免 JSON 文件并发写入冲突
- 🚀 **导入合并模式实现** — 支持"作为新项目导入"和"合并到现有项目"两种模式，合并时自动检测重名并添加序号后缀
- 🚀 **getImageData 返回 data URL** — Rust 端自动检测图片格式并返回完整的 `data:image/...;base64,...` 格式，前端无需手动拼接 MIME
- 🚀 **自动保存策略优化** — 新增定时保存（每30秒）和失焦保存（切换应用时），编辑器失焦仅静默保存不再产生冗余版本快照

**变更文件：**

- `src/stores/characterStore.ts` — 双 store 同步修复
- `src/stores/projectStore.ts` — 导入合并模式支持 + 角色排序
- `src/utils/tauri.ts` — 写入队列 + 导入合并 API
- `src/App.tsx` — 自动保存机制（关闭前/定时/失焦）
- `src/components/Topbar.tsx` — 导入对话框
- `src/components/CharacterList.tsx` — 拖拽排序
- `src/components/CharacterEditor.tsx` — 失焦保存策略调整
- `src/components/ImageGallery.tsx` — 适配 data URL
- `src-tauri/src/commands.rs` — 合并导入 + data URL + UUID 颜色生成
