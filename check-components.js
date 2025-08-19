#!/usr/bin/env node

/**
 * CouplesDNA项目UI组件检查脚本
 * 检查项目中的UI组件使用情况，确保遵循shadcn/ui规范
 */

const fs = require('fs');
const path = require('path');

// 颜色输出函数
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
};

// 配置
const CONFIG = {
  // 需要检查的文件扩展名
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  
  // 需要检查的目录
  directories: ['pages', 'components', 'hooks'],
  
  // shadcn/ui组件列表
  shadcnComponents: [
    'button', 'input', 'avatar', 'skeleton', 'dialog', 'alert-dialog',
    'label', 'textarea', 'select', 'checkbox', 'radio-group', 'switch',
    'card', 'badge', 'separator', 'tooltip', 'popover', 'dropdown-menu'
  ],
  
  // 应该保持不变的定制组件
  preservedComponents: [
    'SimpleChatInterface',
    'MarkdownMessage', 
    'LoadingSpinner',
    'useAutoScroll'
  ],
  
  // 已废弃的旧组件
  deprecatedComponents: [
    'Button.js', 'Input.js', 'Avatar.js'
  ]
};

class ComponentChecker {
  constructor() {
    this.issues = [];
    this.stats = {
      totalFiles: 0,
      checkedFiles: 0,
      shadcnUsage: 0,
      deprecatedUsage: 0,
      goodPractices: 0
    };
  }

  // 递归获取所有文件
  getAllFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        this.getAllFiles(fullPath, files);
      } else if (entry.isFile() && CONFIG.extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // 检查文件内容
  checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    this.stats.checkedFiles++;
    
    // 检查shadcn/ui组件使用
    const shadcnImports = this.findShadcnImports(content);
    if (shadcnImports.length > 0) {
      this.stats.shadcnUsage++;
      this.issues.push({
        type: 'success',
        file: relativePath,
        message: `✅ 使用shadcn/ui组件: ${shadcnImports.join(', ')}`
      });
    }

    // 检查废弃组件使用
    const deprecatedUsage = this.findDeprecatedUsage(content, relativePath);
    if (deprecatedUsage.length > 0) {
      this.stats.deprecatedUsage++;
      deprecatedUsage.forEach(usage => {
        this.issues.push({
          type: 'error',
          file: relativePath,
          message: `❌ 使用了废弃组件: ${usage}`
        });
      });
    }

    // 检查导入路径
    const pathIssues = this.checkImportPaths(content, relativePath);
    pathIssues.forEach(issue => {
      this.issues.push({
        type: 'warning',
        file: relativePath,
        message: `⚠️ 导入路径问题: ${issue}`
      });
    });

    // 检查好的实践
    const goodPractices = this.checkGoodPractices(content);
    if (goodPractices.length > 0) {
      this.stats.goodPractices++;
      goodPractices.forEach(practice => {
        this.issues.push({
          type: 'info',
          file: relativePath,
          message: `📋 良好实践: ${practice}`
        });
      });
    }
  }

  // 查找shadcn/ui组件导入
  findShadcnImports(content) {
    const imports = [];
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]@\/components\/ui\/([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const components = match[1].split(',').map(c => c.trim());
      const moduleName = match[2];
      imports.push(`${moduleName} (${components.join(', ')})`);
    }
    
    return imports;
  }

  // 查找废弃组件使用
  findDeprecatedUsage(content, filePath) {
    const usage = [];
    
    // 检查旧的导入路径
    const oldImportPatterns = [
      /from\s+['"][^'"]*components\/ui\/Button['"]/g,
      /from\s+['"][^'"]*components\/ui\/Input['"]/g,
      /from\s+['"][^'"]*components\/ui\/Avatar['"]/g,
    ];

    oldImportPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        usage.push('旧的UI组件导入路径');
      }
    });

    return usage;
  }

  // 检查导入路径
  checkImportPaths(content, filePath) {
    const issues = [];
    
    // 检查是否使用了相对路径而不是别名
    const relativeUiImports = content.match(/from\s+['"][^'"]*\.\.\/[^'"]*\/ui\/[^'"]+['"]/g);
    if (relativeUiImports) {
      issues.push('应使用@/components/ui/*别名导入而不是相对路径');
    }

    return issues;
  }

  // 检查良好实践
  checkGoodPractices(content) {
    const practices = [];
    
    // 检查cn()工具函数使用
    if (content.includes('cn(')) {
      practices.push('使用cn()工具函数合并CSS类名');
    }

    // 检查TypeScript使用
    if (content.includes('interface ') || content.includes('type ')) {
      practices.push('使用TypeScript类型定义');
    }

    return practices;
  }

  // 运行检查
  run() {
    console.log(colors.bold('\n🔍 CouplesDNA项目UI组件检查\n'));
    
    let allFiles = [];
    CONFIG.directories.forEach(dir => {
      const files = this.getAllFiles(dir);
      allFiles = allFiles.concat(files);
    });

    this.stats.totalFiles = allFiles.length;
    
    console.log(colors.cyan(`检查 ${this.stats.totalFiles} 个文件...\n`));

    allFiles.forEach(file => this.checkFile(file));

    this.printResults();
  }

  // 打印结果
  printResults() {
    console.log(colors.bold('\n📊 检查结果统计：'));
    console.log(`总文件数: ${this.stats.totalFiles}`);
    console.log(`检查文件数: ${this.stats.checkedFiles}`);
    console.log(colors.green(`shadcn/ui使用: ${this.stats.shadcnUsage} 个文件`));
    console.log(colors.red(`废弃组件使用: ${this.stats.deprecatedUsage} 个文件`));
    console.log(colors.blue(`良好实践: ${this.stats.goodPractices} 个文件`));

    if (this.issues.length > 0) {
      console.log(colors.bold('\n📋 详细问题清单：'));
      
      // 按类型分组显示
      const groupedIssues = this.issues.reduce((groups, issue) => {
        groups[issue.type] = groups[issue.type] || [];
        groups[issue.type].push(issue);
        return groups;
      }, {});

      // 显示错误
      if (groupedIssues.error) {
        console.log(colors.bold('\n❌ 错误 (需要立即修复):'));
        groupedIssues.error.forEach(issue => {
          console.log(colors.red(`  ${issue.file}: ${issue.message}`));
        });
      }

      // 显示警告
      if (groupedIssues.warning) {
        console.log(colors.bold('\n⚠️  警告 (建议修复):'));
        groupedIssues.warning.forEach(issue => {
          console.log(colors.yellow(`  ${issue.file}: ${issue.message}`));
        });
      }

      // 显示成功
      if (groupedIssues.success) {
        console.log(colors.bold('\n✅ 正确使用:'));
        groupedIssues.success.slice(0, 5).forEach(issue => { // 只显示前5个
          console.log(colors.green(`  ${issue.file}: ${issue.message}`));
        });
        if (groupedIssues.success.length > 5) {
          console.log(colors.green(`  ... 还有 ${groupedIssues.success.length - 5} 个文件正确使用了shadcn/ui`));
        }
      }
    }

    console.log(colors.bold('\n🎯 建议：'));
    if (this.stats.deprecatedUsage > 0) {
      console.log(colors.red('• 请尽快替换废弃的UI组件'));
    }
    console.log(colors.cyan('• 新功能开发请使用 shadcn/ui 组件'));
    console.log(colors.cyan('• 使用 @/components/ui/* 导入路径'));
    console.log(colors.cyan('• 保持 SimpleChatInterface 等定制组件不变'));
    
    console.log(colors.bold('\n✨ 检查完成!\n'));
  }
}

// 运行检查
if (require.main === module) {
  const checker = new ComponentChecker();
  checker.run();
}

module.exports = ComponentChecker;