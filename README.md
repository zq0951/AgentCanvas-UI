# AgentCanvas UI (NexusBoard)

> **核心理念：“抛弃传统对话框（Post-Chat UI），画布即系统，节点即组件，AI 是调度员”。**

本项目旨在彻底替代局限性极强的现有 Chat 交互方式。二维的无界画布（类似 Figma、Miro、Notion Calendar 的融合体）不仅是通向未来三维“空间计算（Spatial Computing）”的完美过渡，而且天然打破了传统对话流“从上到下线性滚动、信息被迅速淹没”的束缚。

---

## 🛠 当前开发进度 (Roadmap)

- [x] **基础架构**：Next.js 15 (App Router) + Tailwind v4 + React Flow 无界画布。
- [x] **数据持久化**：集成 IndexedDB (idb) 实现本地会话存储，支持 10s 周期性自动巡检保存。
- [x] **多模型网关**：内置 Serverless Proxy，支持 OpenAI、Gemini、Ollama 等 API 聚合切换。
- [x] **动态阶梯布局**: 
  - **防重叠算法**：基于同级节点数量自动计算偏移，子节点从父节点下方阶梯状排列。
- [x] **上下文感知系统**:
  - **全量历史继承**：子节点自动回溯并继承所有祖先节点的对话历史（文本 + 图片）。
- [x] **节点交互增强**:
  - **双格式复制**：支持导出 Markdown 原文或清洗后的纯文本。
  - **物理级自由缩放**：高灵敏度感应区，支持非等比自由拉伸。
- [x] **多模态与粘贴板 (HOT)**: 
  - **剪贴板去重**：内容指纹识别，防止窗口聚焦时重复添加相同的图片。
  - **自动高度适配**：输入框随内容动态伸缩（最高 200px）。
- [x] **交互与视觉 (NEW)**:
  - **自定义 Modal 系统**：全面替换原生系统弹窗，采用大圆角、毛玻璃风格 Nexus 对话框。
  - **文字自由选中**：节点内内容区域开启 `select-text`，支持便捷高亮复制。
  - **持久化 2.0**：优化保存策略，删除或清空画布立即同步数据库，防止节点“复活”。

---

## 🌟 核心特性说明

### 1. 动态防重叠布局 (Staggered Layout)
传统的画布生成往往会导致节点堆叠在一起。NexusBoard 引入了阶梯算法：
- **偏移量计算**：新节点自动应用横向/纵向偏移，避免视觉堆叠。
- **垂直导向**：子节点默认出现在父节点下方，形成清晰的思考路径。

### 2. 深度上下文继承 (Recursive Context)
在 NexusBoard 中，每个节点都是思维的分支：
- **血缘追踪**：新请求会递归爬取所有父辈节点，构建完整的“上下文链条”。
- **多模态对齐**：继承包含文本与图片附件，确保 AI 理解深层推理逻辑。

### 3. 架构稳定性与交互细节 (Stability & UX)
- **高性能渲染**：Recharts 禁用进入动画，解决 Hover 标签消失问题；Markdown 开启 `nowheel nodrag` 以支持节点内独立滚动。
- **即时持久化**：操作（如删除/清空）会触发同步保存，彻底解决异步状态冲突。
- **失焦修复**：静态化 `nodeTypes` 配置，确保巨量节点下输入框保持焦点，无渲染闪烁。

---

## 🧩 技术栈与架构 (Tech Stack)

- **Frontend**: React 19, Next.js 15, TypeScript.
- **Styling**: Tailwind CSS v4, Lucide Icons.
- **Canvas Engine**: React Flow.
- **Markdown**: React-Markdown + Remark-GFM.
- **Persistence**: IndexedDB (via `idb`).

---

## 🚀 快速启动

1. **安装依赖**: `npm install`
2. **启动开发**: `npm run dev`
3. **配置 API**: 在侧边栏的“设置”面板中输入 API Key 即可。
