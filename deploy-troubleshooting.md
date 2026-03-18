# VitePress + GitHub Pages 部署问题排查记录

本文档记录了将 VitePress 文档站点部署到 GitHub Pages 过程中遇到的问题及解决方案。

## 问题 1：GitHub Actions Workflow 未被识别

### 现象

推送代码后，GitHub Actions 页面显示 "Get started with GitHub Actions"，没有看到自定义的 workflow。

### 原因

Workflow 文件 `deploy.yml` 放在了子目录 `react/.github/workflows/` 下，但 GitHub Actions 只识别仓库根目录下的 `.github/workflows/` 目录。

### 解决方案

将 workflow 文件移动到仓库根目录：

```bash
mkdir -p .github/workflows
mv react/.github/workflows/deploy.yml .github/workflows/
rm -rf react/.github
```

同时修改 workflow 中的路径，添加 `working-directory` 和调整 artifact 路径：

```yaml
- name: Install dependencies
  run: npm ci
  working-directory: react

- name: Build with VitePress
  run: npm run build
  working-directory: react

- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: react/docs/.vitepress/dist
```

---

## 问题 2：构建失败 - HTML 标签未闭合

### 现象

GitHub Actions 构建失败，错误信息：

```
[vite:vue] docs/6.3-hydration-system.md (95:11): Element is missing end tag.
```

### 原因

Markdown 文件中的 TypeScript 泛型语法 `Array<CapturedValue>` 被 Vue 解析器误认为是 HTML 标签。

### 解决方案

在表格中使用泛型类型时，需要转义管道符 `|`：

```markdown
<!-- 错误写法 -->
| `hydrationErrors` | `Array<CapturedValue> | null` | 描述 |

<!-- 正确写法 -->
| `hydrationErrors` | `Array<CapturedValue> \| null` | 描述 |
```

批量修复命令：

```bash
for f in docs/*.md; do
  sed -i '' 's/`Array<\([^>]*\)> | null`/`Array<\1> \\| null`/g' "$f"
done
```

---

## 问题 3：构建失败 - 死链接检测

### 现象

本地和 CI 构建失败，错误信息：

```
(!) Found dead link ./fixtures/view-transition/README in file 6.4-view-transitions-and-gesture-scheduling.md
[vitepress] 39 dead link(s) found.
```

### 原因

文档中包含指向 React 源码仓库的相对链接（如 `./packages/`、`./fixtures/`），这些文件在文档站点中不存在。

### 解决方案

在 VitePress 配置中添加 `ignoreDeadLinks` 规则：

```typescript
// docs/.vitepress/config.ts
export default defineConfig({
  // ...
  ignoreDeadLinks: [
    /^\.\/fixtures\//,
    /^\.\/packages\//,
    /^\.\/scripts\//,
    /^\.\/yarn\.lock$/
  ],
})
```

---

## 问题 4：页面白屏 - 资源 404

### 现象

GitHub Pages 部署成功后访问页面白屏，控制台显示资源 404 错误：

```
Failed to load resource: the server responded with a status of 404 ()
https://littlepoolshark.github.io/source-deepdive-wiki/react/assets/app.xxx.js
```

### 原因

`base` 路径配置错误。VitePress 的 `base` 应该与 GitHub Pages 的实际部署路径一致。

由于 `upload-pages-artifact` 直接将 `dist` 目录内容部署到 Pages 根路径，所以：
- 仓库名：`source-deepdive-wiki`
- 实际访问路径：`https://username.github.io/source-deepdive-wiki/`
- 正确的 `base`：`/source-deepdive-wiki/`

### 解决方案

修改 VitePress 配置：

```typescript
// docs/.vitepress/config.ts
export default defineConfig({
  base: '/source-deepdive-wiki/',  // 仓库名，不含子目录
  // ...
})
```

### 最终访问地址

```
https://littlepoolshark.github.io/source-deepdive-wiki/
```

---

## 完整的 GitHub Actions Workflow

```yaml
name: Deploy VitePress site to Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: react/package-lock.json

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Install dependencies
        run: npm ci
        working-directory: react

      - name: Build with VitePress
        run: npm run build
        working-directory: react

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: react/docs/.vitepress/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    needs: build
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 部署前检查清单

- [ ] Workflow 文件位于仓库根目录 `.github/workflows/`
- [ ] `base` 路径与仓库名一致（格式：`/repo-name/`）
- [ ] 本地 `npm run build` 通过
- [ ] GitHub 仓库 Settings > Pages > Source 设置为 "GitHub Actions"
