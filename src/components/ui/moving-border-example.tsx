import React from "react";
import { Button } from "@/components/ui/moving-border";

// 简单的使用示例
export function SimpleMovingBorderExample() {
  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-md mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white">
          动态边框按钮
        </h2>
        
        <Button
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white"
          onClick={() => alert('按钮被点击了！')}
        >
          点击我
        </Button>
        
        <Button
          as="a"
          href="#"
          className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white"
        >
          链接按钮
        </Button>
      </div>
    </div>
  );
}

// 卡片中的使用示例
export function CardMovingBorderExample() {
  return (
    <div className="p-8">
      <div className="max-w-sm mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          产品卡片
        </h3>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          这是一个使用动态边框按钮的产品卡片示例。
        </p>
        
        <div className="space-y-3">
          <Button
            className="w-full bg-blue-500 text-white"
            duration={2000}
          >
            立即购买
          </Button>
          
          <Button
            className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
            borderClassName="bg-[radial-gradient(var(--slate-400)_40%,transparent_60%)]"
          >
            了解更多
          </Button>
        </div>
      </div>
    </div>
  );
} 