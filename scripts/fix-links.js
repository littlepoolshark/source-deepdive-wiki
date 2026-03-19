#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '../react/docs');

// 章节编号到文件名的映射
const chapterMap = {
  '1': '1-overview',
  '1.1': '1.1-repository-structure-and-packages',
  '2': '2-feature-flags-system',
  '3': '3-build-system-and-package-distribution',
  '3.1': '3.1-build-pipeline-and-module-forking',
  '3.2': '3.2-release-channels-and-versioning',
  '3.3': '3.3-cicd-and-artifact-management',
  '4': '4-react-reconciler',
  '4.1': '4.1-fiber-architecture-and-data-structures',
  '4.2': '4.2-work-loop-and-rendering-phases',
  '4.3': '4.3-react-hooks-system',
  '4.4': '4.4-lane-based-scheduling-and-priorities',
  '4.5': '4.5-suspense-and-error-boundaries',
  '4.6': '4.6-host-configuration-abstraction',
  '4.7': '4.7-profiling-and-performance-tracking',
  '5': '5-server-side-rendering',
  '5.1': '5.1-react-fizz-(streaming-ssr)',
  '5.2': '5.2-react-server-components-(flight)',
  '5.3': '5.3-build-integration-for-server-components',
  '5.4': '5.4-server-actions-and-bidirectional-communication',
  '6': '6-platform-implementations',
  '6.1': '6.1-react-dom-implementation',
  '6.2': '6.2-react-native-renderers',
  '6.3': '6.3-hydration-system',
  '6.4': '6.4-view-transitions-and-gesture-scheduling',
  '7': '7-developer-tools-and-debugging',
  '7.1': '7.1-react-devtools-architecture',
  '7.2': '7.2-devtools-distribution-and-integration',
  '7.3': '7.3-eslint-plugin-for-react-hooks',
};

const GITHUB_BASE = 'https://github.com/facebook/react/blob/main';

function fixLinks(content, filename) {
  let fixed = content;
  let changes = [];

  // 1. 修复站内链接 (#X.X) -> (/X.X-xxx)
  // 匹配 [任意文本](#数字.数字) 或 [任意文本](#数字)
  fixed = fixed.replace(/\[([^\]]+)\]\(#(\d+(?:\.\d+)?)\)/g, (match, text, chapter) => {
    const targetFile = chapterMap[chapter];
    if (targetFile) {
      const newLink = `[${text}](/${targetFile})`;
      changes.push(`站内链接: ${match} -> ${newLink}`);
      return newLink;
    }
    return match;
  });

  // 2. 修复空链接的 GitHub 源码引用 [packages/xxx]() -> [packages/xxx](GitHub URL)
  // 匹配 [packages/path/to/file.js]() 或带行号的 [packages/path/to/file.js:100-200]()
  fixed = fixed.replace(/\[(packages\/[^\]]+?)(?::(\d+)-(\d+))?\]\(\)/g, (match, filePath, startLine, endLine) => {
    let url = `${GITHUB_BASE}/${filePath}`;
    let displayText = filePath;
    
    if (startLine && endLine) {
      url += `#L${startLine}-L${endLine}`;
      displayText = `${filePath}#L${startLine}-L${endLine}`;
    }
    
    const newLink = `[${displayText}](${url})`;
    changes.push(`GitHub链接: ${match} -> ${newLink}`);
    return newLink;
  });

  // 3. 修复相对路径的 GitHub 源码引用 (packages/xxx) -> (GitHub URL)
  // 在 <details> 块内的列表项
  fixed = fixed.replace(/\[(packages\/[^\]]+)\]\(packages\/[^\)]+\)/g, (match, filePath) => {
    const url = `${GITHUB_BASE}/${filePath}`;
    const newLink = `[${filePath}](${url})`;
    changes.push(`GitHub相对链接: ${match} -> ${newLink}`);
    return newLink;
  });

  // 4. 修复 ./packages/ 开头的死链接
  fixed = fixed.replace(/\[([^\]]+)\]\(\.\/packages\/([^\)]+)\)/g, (match, text, restPath) => {
    const url = `${GITHUB_BASE}/packages/${restPath}`;
    const newLink = `[${text}](${url})`;
    changes.push(`./packages链接: ${match} -> ${newLink}`);
    return newLink;
  });

  // 5. 修复 ./scripts/, ./fixtures/, ./yarn.lock 等链接
  fixed = fixed.replace(/\[([^\]]+)\]\(\.\/(scripts|fixtures|yarn\.lock)([^\)]*)\)/g, (match, text, pathStart, restPath) => {
    const fullPath = pathStart + (restPath || '');
    const url = `${GITHUB_BASE}/${fullPath}`;
    const newLink = `[${text}](${url})`;
    changes.push(`其他相对链接: ${match} -> ${newLink}`);
    return newLink;
  });

  // 6. 修复带行号范围的引用 [file.js:100-200]() 格式
  fixed = fixed.replace(/\[([^\]:]+):(\d+)-(\d+)\]\(\)/g, (match, filePath, startLine, endLine) => {
    // 如果路径不以 packages/ 开头，尝试补全
    let fullPath = filePath;
    if (!filePath.startsWith('packages/') && !filePath.startsWith('scripts/')) {
      // 可能是简写，跳过
      return match;
    }
    const url = `${GITHUB_BASE}/${fullPath}#L${startLine}-L${endLine}`;
    const newLink = `[${filePath}#L${startLine}-L${endLine}](${url})`;
    changes.push(`行号链接: ${match} -> ${newLink}`);
    return newLink;
  });

  return { content: fixed, changes };
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);
  
  const { content: fixed, changes } = fixLinks(content, filename);
  
  if (changes.length > 0) {
    fs.writeFileSync(filePath, fixed);
    console.log(`\n📝 ${filename} (${changes.length} 处修改)`);
    changes.forEach(c => console.log(`   ${c}`));
    return changes.length;
  }
  return 0;
}

// 处理所有 md 文件
const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && f !== 'index.md');
let totalChanges = 0;

console.log('开始修复链接...\n');

files.forEach(file => {
  totalChanges += processFile(path.join(docsDir, file));
});

console.log(`\n✅ 完成！共修复 ${totalChanges} 处链接`);
