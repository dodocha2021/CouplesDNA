# Moving Border 组件

一个使用 Framer Motion 创建的炫酷动态边框按钮组件，为您的应用添加视觉吸引力。

## 功能特性

- ✨ 动态移动的边框效果
- 🎨 完全可自定义的样式
- ⚡ 可调节的动画速度
- 🔗 支持渲染为链接
- 📱 响应式设计
- 🌙 支持深色模式

## 安装依赖

确保已安装以下依赖：

```bash
npm install framer-motion
```

## 基本用法

```tsx
import { Button } from "@/components/ui/moving-border";

function MyComponent() {
  return (
    <Button
      className="bg-blue-500 text-white"
      onClick={() => console.log('按钮被点击')}
    >
      点击我
    </Button>
  );
}
```

## 属性说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `borderRadius` | `string` | `"1.75rem"` | 按钮圆角大小 |
| `duration` | `number` | `2000` | 动画持续时间（毫秒） |
| `className` | `string` | - | 按钮内容区域的样式类 |
| `containerClassName` | `string` | - | 按钮容器的样式类 |
| `borderClassName` | `string` | - | 边框的样式类 |
| `as` | `any` | `"button"` | 渲染的 HTML 元素类型 |
| `children` | `ReactNode` | - | 按钮内容 |

## 高级用法

### 自定义动画速度

```tsx
<Button
  duration={1000} // 快速动画
  className="bg-red-500 text-white"
>
  快速动画
</Button>

<Button
  duration={5000} // 慢速动画
  className="bg-blue-500 text-white"
>
  慢速动画
</Button>
```

### 自定义边框颜色

```tsx
<Button
  borderClassName="bg-[radial-gradient(var(--pink-500)_40%,transparent_60%)]"
  className="bg-pink-500 text-white"
>
  粉色边框
</Button>
```

### 链接按钮

```tsx
<Button
  as="a"
  href="/about"
  className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
>
  访问关于页面
</Button>
```

### 不同圆角大小

```tsx
<Button borderRadius="0.5rem" className="bg-green-500 text-white">
  小圆角
</Button>

<Button borderRadius="2rem" className="bg-purple-500 text-white">
  大圆角
</Button>
```

## 样式定制

### 使用 Tailwind 类

```tsx
<Button
  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold"
  containerClassName="shadow-lg"
>
  自定义样式
</Button>
```

### 深色模式支持

```tsx
<Button
  className="bg-white dark:bg-slate-900 text-black dark:text-white border-neutral-200 dark:border-slate-800"
>
  深色模式适配
</Button>
```

## 最佳实践

1. **性能优化**: 避免在列表中使用过多的动态边框按钮，因为每个按钮都会创建动画帧
2. **可访问性**: 确保按钮有足够的对比度和清晰的文本
3. **用户体验**: 使用适当的动画速度，避免过快或过慢的动画
4. **响应式设计**: 在不同屏幕尺寸上测试按钮的显示效果

## 故障排除

### 动画不显示
- 确保已正确安装 `framer-motion`
- 检查浏览器是否支持 CSS 动画

### 样式不生效
- 确保 Tailwind CSS 配置正确
- 检查 CSS 变量是否正确设置

### TypeScript 错误
- 确保 `useRef` 有初始值：`useRef<any>(null)`

## 示例

查看以下文件获取更多示例：
- `moving-border-demo.tsx` - 完整演示
- `moving-border-example.tsx` - 简单使用示例 