# AgentCanvas UI (NexusBoard)

> **核心理念：“抛弃传统对话框（Post-Chat UI），画布即系统，节点即组件，AI 是调度员”。**

本项目旨在彻底替代局限性极强的现有 Chat 交互方式。二维的无界画布（类似 Figma、Miro、Notion Calendar 的融合体）不仅是通向未来三维“空间计算（Spatial Computing）”的完美过渡，而且天然打破了传统对话流“从上到下线性滚动、信息被迅速淹没”的束缚。

---

## 🛠 当前开发进度 (Roadmap)

- [x] **基础架构**：Next.js 16 (App Router + Turbopack) + React 19 + React Flow 无界画布。
- [x] **零摩擦意图预测 (Zero-Friction)**：
  - **后端链式生成**：在 AI 回复流结束后，后端自动触发第二阶段 LLM 调用，生成 3 个具体的后续行动建议。
  - **SSE 流合并**：采用 `ReadableStream` 将主回答与 JSON 格式的建议按钮合并在同一个 SSE 通道中，消除前端二次 RTT。
- [x] **渲染稳定性 2.0 (NEW)**：
  - **静态组件引用**：重构 `nodeTypes` 与 `dynamic` 导入策略，彻底消除流式更新时的画布闪烁与连线断裂。
- [x] **数据持久化**：集成 IndexedDB (idb) 实现本地会话存储，支持 10s 周期性自动巡检保存。
- [x] **多模型网关**：内置 Serverless Proxy，支持 OpenAI、Gemini、Ollama 等 API 聚合切换。
- [x] **动态阶梯布局**: 
  - **防重叠算法**：基于同级节点数量自动计算偏移，子节点从父节点下方阶梯状排列。
- [x] **上下文感知系统**:
  - **全量历史继承**：子节点自动回溯并继承所有祖先节点的对话历史（文本 + 图片）。
- [x] **多模态与粘贴板**: 
  - **内容指纹识别**：防止窗口聚焦时重复添加相同的图片；支持 5MB 文件限制。
- [x] **交互与视觉**:
  - **输入框垂直居中**：优化 `DockInput` 布局，确保单行/多行输入时操作按钮完美对齐。
  - **自定义 Modal 系统**：采用大圆角、毛玻璃风格 Nexus 对话框。

---

## 🌟 核心特性说明

### 1. 零摩擦意图预测 (Zero-Friction Intent Prediction)
传统的“建议回复”往往流于表面（如“请继续”）。NexusBoard 的预测引擎：
- **具体化指令**：模型被严禁生成元描述，必须生成如“分析具体瓶颈”、“生成重构模板”等可直接触发深度内容的指令。
- **语言自适应**：自动锁定用户输入的原始语言（如中文），确保预测按钮的文案与沟通语境完美契合。

### 2. SSE 合并流架构 (Chained SSE Stream)
为了实现极致的响应速度，我们重构了后端：
- **单通道传输**：通过 `ReadableStream` 控制器，在主文本流 [DONE] 之前注入建议数据。
- **结构化输出**：利用 Gemini `responseSchema` 和 OpenAI JSON Mode 确保建议按钮 100% 可解析。

### 3. 架构稳定性 (Architecture Stability)
- **无感更新**：通过将节点定义移出组件渲染循环，解决了 React Flow 在数据高频更新时的性能瓶颈。
- **深度持久化**：清空画布或删除节点会立即触发同步，确保用户在刷新页面后看到的是最终状态。

---

## 🧩 技术栈与架构 (Tech Stack)

- **Frontend**: React 19, Next.js 16 (Turbopack), TypeScript.
- **Styling**: Tailwind CSS v4 (Glassmorphism), Lucide Icons.
- **Canvas Engine**: React Flow.
- **Markdown**: React-Markdown + Remark-GFM (Dynamic loading).
- **Persistence**: IndexedDB (via `idb`).

---

## 🚀 快速启动

1. **安装依赖**: `npm install`
2. **启动开发**: `npm run dev`
3. **配置 API**: 在侧边栏的“设置”面板中输入 API Key 即可。
