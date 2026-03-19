# AgentCanvas UI (NexusBoard)

> **核心理念：“抛弃传统对话框（Post-Chat UI），画布即系统，节点即组件，AI 是调度员”。**

本项目旨在彻底替代局限性极强的现有 Chat 交互方式。二维的无界画布（类似 Figma、Miro、Notion Calendar 的融合体）不仅是通向未来三维“空间计算（Spatial Computing）”的完美过渡，而且天然打破了传统对话流“从上到下线性滚动、信息被迅速淹没”的束缚。

---

## 🛠 当前开发进度 (Roadmap)

- [x] **基础架构**：Next.js 15 (App Router) + Tailwind v4 + React Flow 无界画布。
- [x] **数据持久化**：集成 IndexedDB (idb) 实现本地会话存储，支持 10s 周期性自动巡检保存。
- [x] **多模型网关**：内置 Serverless Proxy，支持 OpenAI、Gemini、Ollama 等 API 聚合切换。
- [x] **动态阶梯布局 (NEW)**: 
  - **防重叠算法**：基于同级节点（Siblings）数量自动计算偏移，根节点从视口中心错开，子节点从父节点下方阶梯状排列（120px 横向 / 80px 纵向偏移）。
- [x] **上下文感知系统 (NEW)**:
  - **全量历史继承**：子节点自动回溯并继承所有祖先节点的对话历史（文本 + 图片），支持深层复杂推理。
- [x] **节点交互增强**:
  - **双格式复制**：支持一键导出 Markdown 原文或清洗后的纯文本。
  - **物理级自由缩放**：高灵敏度感应区 + 视觉折角引导，支持非等比自由拉伸。
- [x] **多模态增强**: 
  - **剪贴板集成**：支持直接从系统剪贴板粘贴图片，自动识别并关联至当前输入。
  - **自动高度适配**：输入框随内容动态伸缩（最高 200px），确保长文本输入不局促。
- [x] **实时流式传输**: 完善 SSE/Gemini Stream 流式响应，支持打字机实时渲染。
- [x] **视口智能追踪**: 实现生成新节点时的丝滑自动对焦（setCenter）与历史会话自动复位。

---

## 🌟 核心特性说明

### 1. 动态防重叠布局 (Staggered Layout)
传统的画布生成往往会导致节点堆叠在一起。NexusBoard 引入了**动态阶梯算法**：
- **智能计数**：实时获取 `nodesRef` 中的同级节点数。
- **阶梯偏移**：新节点会根据索引自动应用 `(staggerIndex * 120px, staggerIndex * 80px)` 的偏移量。
- **垂直导向**：子节点默认出现在父节点下方 200px 处，形成清晰的决策树结构。

### 2. 深度上下文继承 (Recursive Context)
不同于普通的 Chat，在 NexusBoard 中：
- **血缘追踪**：每个节点都明确记录其 `parentId`。
- **历史回溯**：发送请求时，系统会递归爬取所有父辈节点的内容，构建出完整的“思考链条”。
- **多模态对齐**：继承不仅包含文本，还包括历史节点中的所有图片附件。

### 3. 极速输入体验 (Input Ergonomics)
- **剪贴板直达**：在 Dock 输入框中 `Ctrl+V` 即可瞬间上传图片。
- **弹性 TextArea**：输入框高度会随文字量自动增长，保持操作流畅感。
- **自动对焦**：生成新节点后，画布会自动平滑移动到最佳视角，让您始终处于创作中心。

### 4. 架构稳定性 (UI Performance)
通过将 `nodeTypes`、`edgeTypes` 等关键 React Flow 配置静态化，解决了 React 组件重绘导致的**输入框失焦**与**画布闪烁**问题，确保在拥有数百个节点的巨型画布上依然保持丝滑响应。

---

## 🧩 技术栈与架构 (Tech Stack)

- **Frontend**: React 19, Next.js 15, TypeScript.
- **Styling**: Tailwind CSS v4, Lucide Icons.
- **Canvas Engine**: React Flow (自定义 NodeTypes & EdgeTypes).
- **Markdown**: React-Markdown + Remark-GFM (表格支持).
- **Persistence**: IndexedDB (使用 `idb` 库封装).
- **AI Integration**: 自研 Multi-Provider Proxy (支持流式输出)。

---

## 🚀 快速启动

1. **安装依赖**:
   ```bash
   npm install
   ```
2. **启动开发服务器**:
   ```bash
   npm run dev
   ```
3. **配置 API**:
   在侧边栏的“设置”面板中输入您的 OpenAI/Gemini API Key 即可开始。
