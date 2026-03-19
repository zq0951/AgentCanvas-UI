# AgentCanvas UI (NexusBoard)

> **核心理念：“抛弃传统对话框（Post-Chat UI），画布即系统，节点即组件，AI 是调度员”。**

本项目旨在彻底替代局限性极强的现有 Chat 交互方式。二维的无界画布（类似 Figma、Miro、Notion Calendar 的融合体）不仅是通向未来三维“空间计算（Spatial Computing）”的完美过渡，而且天然打破了传统对话流“从上到下线性滚动、信息被迅速淹没”的束缚。

---

## 🛠 当前开发进度 (Roadmap)

- [x] **基础架构**：Next.js 15 (App Router) + Tailwind v4 + React Flow 无界画布。
- [x] **数据持久化**：集成 IndexedDB (idb) 实现本地会话存储，支持 1.5s 智能防抖保存。
- [x] **多模型网关**：内置 Serverless Proxy，支持 OpenAI、Gemini、Ollama 等 API 聚合切换。
- [x] **节点交互增强** (NEW):
  - **双格式复制**：支持一键导出 Markdown 原文或清洗后的纯文本。
  - **物理级自由缩放**：高灵敏度感应区 + 视觉折角引导，支持非等比自由拉伸。
  - **节点内推导**：每个节点自带局部输入框，支持基于当前上下文的零摩擦追问。
- [x] **AI 智能建议**：基于内容自动生成 Suggestion Chips，点击即连线分裂新节点。
- [x] **数据展现**：支持 GFM 表格高精渲染、代码块高亮及内容复制。
- [x] **多模态增强** (NEW): 支持图片、文件上传，与 Gemini-1.5-Pro 等模型深度集成。
- [x] **实时流式传输** (NEW): 完善 SSE/Gemini Stream 流式响应，支持打字机实时渲染。
- [x] **高频自动保存**: 集成 10s 周期性自动巡检保存，确保极端故障下数据不丢失。
- [ ] **高级组件节点**: 引入基于 ECharts 的动态图表节点与数据看板。

---

## 🌟 核心特性说明

### 1. 零摩擦追问 (Local-In-Node Follow-up)
传统的对话需要回到屏幕底部的全局输入框。在 NexusBoard 中，每个生成的 Insight 节点底部都自带一个**局部输入框**。当您在特定节点输入追问时，系统会自动携带该节点的上下文发送给 AI，并生动地分裂出一个子节点。

### 2. 物理级缩放系统 (High-Precision Resizer)
为了适配复杂的分析结果（如超长代码或大型对比表格），我们实现了一套极其灵敏的缩放系统：
- **巨型感应区**：角落具备 48px 的隐性触控区，盲操即可触发。
- **自由比例**：不再锁定长宽比，用户可根据内容自由调整为“横向对比模式”或“纵向阅读模式”。

### 3. 多模态智慧底座 (Multi-modal Dock)
全新的全局输入框（Dock）支持：
- **文件感知**：直接上传图片或文档，AI 能够“看见”并围绕文件内容展开分析。
- **状态同步**：实时反馈模型列表、API 连通状态及多模态激活标识。
- **隐藏式交互**：在画布有内容时自动半隐藏，鼠标悬停即刻唤出，最大化创作空间。

### 4. 本地优先 (Local-First Privacy)
所有画布节点、连线关系、系统配置均存储在用户浏览器的 **IndexedDB** 中。这意味着即使刷新页面或在断网环境下，您的思维导图也绝对安全且秒速加载。配合 **10s 巡检自动保存** 机制，彻底告别“忘存丢失”的恐惧。

---

## 🧩 技术栈与架构 (Tech Stack)

- **Frontend**: React 19, Next.js 15, TypeScript.
- **Styling**: Tailwind CSS v4 (基于 `@tailwindcss/postcss`), Lucide Icons.
- **Canvas Engine**: React Flow (自定义 NodeTypes & EdgeTypes).
- **Markdown**: React-Markdown + Remark-GFM (表格支持).
- **Persistence**: IndexedDB (使用 `idb` 库封装).
- **AI Integration**: 自研 Multi-Provider Proxy (支持流式输出)。

---

## ⚠️ 已知问题与局限 (Known Issues)

- [ ] **画布自动追踪失效 (Critical)**：目前在生成新节点或点击建议按钮时，**视口无法稳定自动平滑移动到新节点位置**。虽然已尝试过 `fitView`、`setCenter` 及递归 Store 检查等多种方案，但受限于 React Flow 内部状态同步时序与浏览器渲染帧的冲突，该功能目前仍处于**不可用状态**。用户需手动缩放或拖拽画布来寻找新生成的卡片。
- [ ] **字体缩放模糊 (Partial)**：在极小或极大缩放比例下，部分浏览器（如 Chrome/Edge）的文本抗锯齿可能出现虚化。已通过 CSS 优化缓解，但尚未根除。

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

---

## 💡 为什么需要 AgentCanvas？

1. **终结流水账交互**：线性对话流无法承载复杂的多维推导，画布是解放非线性思考的唯一解。
2. **真正的思维飞轮**：从“打字重写 Prompt”进化为“一键点击建议 + 局部精准追问”。
3. **为空间计算打底**：Canvas 的 (x, y) 坐标系是通向 AR/VR 空间 UI 的桥头堡。
