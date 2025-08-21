我将分步对 pages/test-finalreport.js 文件进行修改，核心是集成一个从外部API获取数据并更新UI的流程。

  ---

  第一步：分析现有组件状态

   * 目标：理解当前页面是如何管理那五个问题输入框的数据的。
   * 行动：
       1. 我会仔细阅读 pages/test-finalreport.js 的代码。
       2. 定位到渲染 "Report Page Prompts" 模块的JSX代码块。
       3. 找到负责存储这五个问题内容的React useState 钩子。我需要确定这些状态变量的名称（例如，是五个单独的 useState 还是一个包含数组或对象的
          useState），以及它们的更新函数（例如 setPrompt1, setPrompt2 等）。这是后续更新UI的关键。

  ---

  第二步：增强组件状态管理

   * 目标：为新的 "AI生成" 功能添加加载状态，以提升用户体验。
   * 行动：
       1. 在组件顶部，我会添加一个新的状态变量：const [isLoading, setIsLoading] = useState(false);
       2. 作用：这个 isLoading 状态将用于：
           * 在点击 "AI 生成" 按钮后，将其禁用，防止用户重复点击。
           * 可以在按钮文本中显示 "正在生成..."，为用户提供清晰的视觉反馈。

  ---

  第三步：实现UI变更

   * 目标：在页面上添加 "AI 生成" 按钮。
   * 行动：
       1. 在 "Report Page Prompts" 模块的JSX中，找到现有的 "Save Prompts" 按钮。
       2. 在它旁边，我会添加一个新的 <button> 元素。
       3. 按钮属性：
           * `onClick`: 绑定到一个即将创建的新函数 handleAIGenerate。
           * `disabled`: 绑定到 isLoading 状态 (disabled={isLoading}), 这样在加载数据时按钮会变为不可用。
           * 文本: 按钮显示的文本可以是 "AI 生成" 或根据 isLoading 状态动态显示 "正在生成..."。

  ---

  第四步：创建核心逻辑函数 (`handleAIGenerate`)

   * 目标：封装所有与 "AI 生成" 功能相关的逻辑，包括API调用和状态更新。
   * 行动：
       1. 在React组件内部，定义一个名为 handleAIGenerate 的异步函数 (async)。
       2. 函数内部逻辑：
           * 开始加载: 函数第一行将调用 setIsLoading(true); 来启动加载状态。
           * API 请求: 使用 try...catch...finally 结构来确保代码的健壮性。
               * `try` 块:
                   1. 使用 await fetch(...) 向指定的 n8n webhook URL 发起网络请求。
                   2. 检查响应是否成功 (e.g., response.ok)。
                   3. 使用 await response.json() 解析返回的JSON数据。
                   4. 数据填充: 调用在第一步中找到的状态更新函数，将从API获取的5个 instruction 文本分别设置到对应的状态变量中。
               * `catch` 块:
                   1. 如果网络请求或JSON解析失败，将捕获错误。
                   2. 使用 console.error() 将错误信息打印到浏览器控制台，便于调试。
               * `finally` 块:
                   1. 无论成功还是失败，最后都会执行 setIsLoading(false);，以确保按钮恢复可用状态。