计划：重构“我的报告”页面数据源与导航逻辑

  目标: 修改 Dashboard 页面中的 "My Reports" (我的报告) 部分，使其数据完全来源于 workflow_progress
  表，并更新其导航逻辑以直接跳转到最终报告页面。

  ---

  第一阶段：分析与定位

   1. 目标页面: http://localhost:3000/dashboard
   2. 对应文件:
       * 主页面文件是 pages/dashboard.js。
       * 根据项目结构和用户请求的上下文，"My Reports" 的具体内容和逻辑很可能封装在 components/content/MyReportsContent.tsx 组件中。
   3. 核心任务: 修改 components/content/MyReportsContent.tsx 文件，改变其数据获取、处理和展示的逻辑。

  ---

  第二阶段：详细修改计划 (File-by-File)

  文件: `components/content/MyReportsContent.tsx` (待修改)

  操作: 全面重构此组件的数据逻辑和链接行为。

   1. 修改数据获取逻辑 (`useEffect` Hook):
       * 定位: 找到组件中用于获取报告数据的 useEffect hook。
       * 替换查询: 将当前的数据查询逻辑（无论来源是哪个表）替换为从 workflow_progress 表查询。
       * 新查询代码 (Supabase v2):

    1     // 在 useEffect hook 内部
    2     const fetchReports = async () => {
    3       setIsLoading(true); // 假设有 isLoading 状态
    4       setError(null); // 假设有 error 状态
    5 
    6       try {
    7         // 1. 获取当前用户
    8         const { data: { user } } = await supabase.auth.getUser();
    9         if (!user) throw new Error("用户未登录");
   10 
   11         // 2. 从 workflow_progress 表获取该用户的所有记录
   12         const { data, error } = await supabase
   13           .from('workflow_progress')
   14           .select('session_id, status, created_at, total_steps, current_step') // 选择需要的字段
   15           .eq('user_id', user.id) // 关键：按当前 user_id 筛选
   16           .order('created_at', { ascending: false }); // 按创建时间降序排序
   17 
   18         if (error) throw error;
   19 
   20         // 3. 更新组件状态
   21         setReports(data); // 将获取到的报告存入 state
   22 
   23       } catch (err) {
   24         console.error("获取报告失败:", err);
   25         setError(err.message);
   26       } finally {
   27         setIsLoading(false);
   28       }
   29     };
   30 
   31     fetchReports();

   2. 更新统计数据计算:
       * 定位: 找到计算 "Total Reports" 和 "Completed" 的地方。
       * 修改逻辑: 基于从 workflow_progress 获取的数据重新计算。

   1     // 这个计算逻辑可以放在 useEffect 之后，或者在渲染部分直接计算
   2     const totalReports = reports.length;
   3     const completedReports = reports.filter(report => report.status === 'completed').length;

   3. 更新 JSX 渲染逻辑:
       * 更新统计卡片: 将 totalReports 和 completedReports 变量应用到对应的显示卡片上。

   1     // 示例：
   2     <div className="... card ...">
   3       <h3 className="...">Total Reports</h3>
   4       <p className="...">{totalReports}</p>
   5     </div>
   6     <div className="... card ...">
   7       <h3 className="...">Completed</h3>
   8       <p className="...">{completedReports}</p>
   9     </div>

       * 更新报告列表:
           * 修改列表的 .map() 循环，使其遍历从 workflow_progress 获取的 reports 状态。
           * 修改 "View" (查看) 按钮，使其成为一个指向最终报告页面的链接。推荐使用 Next.js 的 <Link> 组件以实现平滑的客户端导航。

    1     // 示例：在报告列表的渲染部分
    2     import Link from 'next/link'; // 确保在文件顶部导入 Link
    3 
    4     // ...
    5     <div className="... report-list ...">
    6       {reports.map((report) => (
    7         <div key={report.session_id} className="... report-item ...">
    8           <div>
    9             <p className="font-medium">{report.session_id}</p>
   10             <p className="text-sm text-gray-500">
   11               Status: {report.status} | Created: {new Date(report.created_at).toLocaleDateString()}
   12             </p>
   13           </div>
   14           <div>
   15             {/* 关键修改：将按钮改为 Link 组件 */}
   16             <Link
   17               href={`/test-finalreport/${report.session_id}?completed=true`}
   18               passHref
   19             >
   20               <a className="... view-button ...">
   21                 View
   22               </a>
   23             </Link>
   24           </div>
   25         </div>
   26       ))}
   27     </div>

  ---

  第三阶段：验证计划

   1. 启动应用 并登录。
   2. 导航到 Dashboard 页面。
   3. 验证统计数据:
       * 检查 "Total Reports" 显示的数字是否与您在 Supabase workflow_progress 表中该用户的记录总数一致。
       * 检查 "Completed" 显示的数字是否与该用户 status 为 completed 的记录总数一致。
   4. 验证报告列表:
       * 确认列表显示的报告（特别是 session_id）与数据库中的记录一致。
   5. 验证导航:
       * 点击任意报告的 "View" 按钮。
       * 确认页面跳转到了正确的 URL，格式为 http://localhost:3000/test-finalreport/SESSION_ID_HERE?completed=true。