#!/usr/bin/env node

/**
 * CouplesDNA Project UI Component Check Script
 * Checks the usage of UI components in the project to ensure compliance with shadcn/ui specifications
 */

const fs = require('fs');
const path = require('path');

// Color output function
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
};

// Configuration
const CONFIG = {
  // File extensions to check
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  
  // Directories to check
  directories: ['pages', 'components', 'hooks'],
  
  // shadcn/ui component list
  shadcnComponents: [
    'button', 'input', 'avatar', 'skeleton', 'dialog', 'alert-dialog',
    'label', 'textarea', 'select', 'checkbox', 'radio-group', 'switch',
    'card', 'badge', 'separator', 'tooltip', 'popover', 'dropdown-menu'
  ],
  
  // Custom components that should remain unchanged
  preservedComponents: [
    'SimpleChatInterface',
    'MarkdownMessage', 
    'LoadingSpinner',
    'useAutoScroll'
  ],
  
  // Deprecated old components
  deprecatedComponents: [
    'Input.js', 'Avatar.js'
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

  // Recursively get all files
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

  // Check file content
  checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    this.stats.checkedFiles++;
    
    // Check shadcn/ui component usage
    const shadcnImports = this.findShadcnImports(content);
    if (shadcnImports.length > 0) {
      this.stats.shadcnUsage++;
      this.issues.push({
        type: 'success',
        file: relativePath,
        message: `✅ Using shadcn/ui components: ${shadcnImports.join(', ')}`
      });
    }

    // Check for deprecated component usage
    const deprecatedUsage = this.findDeprecatedUsage(content, relativePath);
    if (deprecatedUsage.length > 0) {
      this.stats.deprecatedUsage++;
      deprecatedUsage.forEach(usage => {
        this.issues.push({
          type: 'error',
          file: relativePath,
          message: `❌ Used deprecated component: ${usage}`
        });
      });
    }

    // Check import paths
    const pathIssues = this.checkImportPaths(content, relativePath);
    pathIssues.forEach(issue => {
      this.issues.push({
        type: 'warning',
        file: relativePath,
        message: `⚠️ Import path issue: ${issue}`
      });
    });

    // Check for good practices
    const goodPractices = this.checkGoodPractices(content);
    if (goodPractices.length > 0) {
      this.stats.goodPractices++;
      goodPractices.forEach(practice => {
        this.issues.push({
          type: 'info',
          file: relativePath,
          message: `📋 Good practice: ${practice}`
        });
      });
    }
  }

  // Find shadcn/ui component imports
  findShadcnImports(content) {
    const imports = [];
    const importRegex = /import\s+{\([^}]+\)}\s+from\s+['"]@\/components\/ui\/([^'\"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const components = match[1].split(',').map(c => c.trim());
      const moduleName = match[2];
      imports.push(`${moduleName} (${components.join(', ')})`);
    }
    
    return imports;
  }

  // Find deprecated component usage
  findDeprecatedUsage(content, filePath) {
    const usage = [];
    
    // Check for old import paths
    const oldImportPatterns = [
      /from\s+['"][^'"]*components\/ui\/Button['"]/g,
      /from\s+['"][^'"]*components\/ui\/Input['"]/g,
      /from\s+['"][^'"]*components\/ui\/Avatar['"]/g,
    ];

    oldImportPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        usage.push('Old UI component import path');
      }
    });

    return usage;
  }

  // Check import paths
  checkImportPaths(content, filePath) {
    const issues = [];
    
    // Check if relative paths are used instead of aliases
    const relativeUiImports = content.match(/from\s+['"][^'"]*\.\.\/[^'"]*\/ui\/[^'"]+['"]/g);
    if (relativeUiImports) {
      issues.push('Should use @/components/ui/* alias for imports instead of relative paths');
    }

    return issues;
  }

  // Check for good practices
  checkGoodPractices(content) {
    const practices = [];
    
    // Check for cn() utility function usage
    if (content.includes('cn(')) {
      practices.push('Using cn() utility function to merge CSS class names');
    }

    // Check for TypeScript usage
    if (content.includes('interface ') || content.includes('type ')) {
      practices.push('Using TypeScript type definitions');
    }

    return practices;
  }

  // Run the check
  run() {
    console.log(colors.bold('\n🔍 CouplesDNA Project UI Component Check\n'));
    
    let allFiles = [];
    CONFIG.directories.forEach(dir => {
      const files = this.getAllFiles(dir);
      allFiles = allFiles.concat(files);
    });

    this.stats.totalFiles = allFiles.length;
    
    console.log(colors.cyan(`Checking ${this.stats.totalFiles} files...\n`));

    allFiles.forEach(file => this.checkFile(file));

    this.printResults();
  }

  // Print the results
  printResults() {
    console.log(colors.bold('\n📊 Check Result Statistics:'));
    console.log(`Total files: ${this.stats.totalFiles}`);
    console.log(`Checked files: ${this.stats.checkedFiles}`);
    console.log(colors.green(`shadcn/ui usage: ${this.stats.shadcnUsage} files`));
    console.log(colors.red(`Deprecated component usage: ${this.stats.deprecatedUsage} files`));
    console.log(colors.blue(`Good practices: ${this.stats.goodPractices} files`));

    if (this.issues.length > 0) {
      console.log(colors.bold('\n📋 Detailed Issue List:'));
      
      // Group issues by type
      const groupedIssues = this.issues.reduce((groups, issue) => {
        groups[issue.type] = groups[issue.type] || [];
        groups[issue.type].push(issue);
        return groups;
      }, {});

      // Show errors
      if (groupedIssues.error) {
        console.log(colors.bold('\n❌ Errors (needs immediate fixing):'));
        groupedIssues.error.forEach(issue => {
          console.log(colors.red(`  ${issue.file}: ${issue.message}`));
        });
      }

      // Show warnings
      if (groupedIssues.warning) {
        console.log(colors.bold('\n⚠️  Warnings (recommended to fix):'));
        groupedIssues.warning.forEach(issue => {
          console.log(colors.yellow(`  ${issue.file}: ${issue.message}`));
        });
      }

      // Show success
      if (groupedIssues.success) {
        console.log(colors.bold('\n✅ Correct Usage:'));
        groupedIssues.success.slice(0, 5).forEach(issue => { // Only show the first 5
          console.log(colors.green(`  ${issue.file}: ${issue.message}`));
        });
        if (groupedIssues.success.length > 5) {
          console.log(colors.green(`  ... and ${groupedIssues.success.length - 5} more files correctly use shadcn/ui`));
        }
      }
    }

    console.log(colors.bold('\n🎯 Recommendations:'));
    if (this.stats.deprecatedUsage > 0) {
      console.log(colors.red('• Please replace deprecated UI components as soon as possible'));
    }
    console.log(colors.cyan('• Please use shadcn/ui components for new feature development'));
    console.log(colors.cyan('• Use @/components/ui/* for import paths'));
    console.log(colors.cyan('• Keep custom components like SimpleChatInterface unchanged'));
    
    console.log(colors.bold('\n✨ Check complete!\n'));
  }
}

// Run the check
if (require.main === module) {
  const checker = new ComponentChecker();
  checker.run();
}

module.exports = ComponentChecker;