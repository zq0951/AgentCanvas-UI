# 🤖 AgentCanvas-UI - AI 开发与迭代规范 (AI Coding Guidelines)

## 🎯 项目上下文 (Context)
本项目是一个重交互的画布类 Web 应用 (AgentCanvas-UI)，基于 **Next.js 16 (App Router + Turbopack) + React 19 + React Flow** 构建。性能和渲染控制是第一优先级。

## 🛡️ 核心开发护栏 (Architecture Guardrails)

### 1. RSC 与 Client Boundary (组件边界控制)
- **默认优先**：所有新组件默认必须是 Server Component。
- **按需 Client**：只有当组件需要处理用户交互、使用 Hooks 或依赖浏览器 API 时，才添加 `'use client'`。
- **组合模式**：严禁在 Client Component 中直接导入重型 Server Component。

### 2. React Flow 稳定性 (Critical for UX)
- **组件外部定义 (Top-level definition)**：`nodeTypes` 和 `edgeTypes` 以及通过 `dynamic` 导入的节点组件 **必须定义在组件外部**。
- **防止闪烁**：严禁在渲染循环中生成新的组件引用，否则会导致 React Flow 强制重排 (Remount)，造成连线丢失和 UI 闪烁。
- **Handle 自动匹配**：除非有特殊多 Handle 需求，否则优先使用默认的 Handle 配置以确保连线兼容性。

### 3. 状态管理与数据流 (Zustand & SSE)
- **精准订阅**：在组件中读取 Zustand 状态时，必须使用 Selector。
- **SSE 流合并**：后端 `/api/chat` 采用 `ReadableStream`。在主要回答流结束后，会追加 `data: {"suggestions": [...]}\n\n` 载荷。
- **意图预测 (Zero-Friction)**：由后端直接链式生成，前端 `ChatHandler` 负责解析并更新节点数据的 `suggestions` 字段。

### 4. 性能与体积治理 (Bundle Size)
- **动态加载**：Recharts、Markdown 等重型依赖强制使用 `next/dynamic` 且 `ssr: false`。
- **样式规范**：输入框布局必须使用 `items-center` 确保垂直居中，UI 采用 Tailwind v4 玻璃拟态。

---

## 🛠️ AI 迭代标准工作流 (AI Standard Operating Procedure)
1. **🧩 架构决策**：明确组件归属 (Server/Client) 及引用稳定性策略。
2. **📦 依赖评估**：引入重型包时必须同步提供 `next/dynamic` 方案。
3. **💻 代码输出**：确保节点数据更新是增量的，不会覆盖现有的 `suggestions` 或 `chartData`。
4. **⚠️ 风险提示**：主动评估代码对 React Flow 画布渲染频率的影响。
