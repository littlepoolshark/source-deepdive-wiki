import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  title: 'React 19 源码深度解析',
  description: 'React 19 核心源码架构与实现原理中文解析',
  base: '/react/',
  lang: 'zh-CN',
  
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/react-icon.svg' }]
  ],

  mermaid: {
    // Mermaid configuration
  },

  themeConfig: {
    logo: '/react-icon.svg',
    
    nav: [
      { text: '首页', link: '/' },
      { text: '概述', link: '/1-overview' },
      { text: 'GitHub', link: 'https://github.com/facebook/react' }
    ],

    sidebar: [
      {
        text: '概述',
        items: [
          { text: '总览', link: '/1-overview' },
          { text: '仓库结构与包', link: '/1.1-repository-structure-and-packages' }
        ]
      },
      {
        text: 'Feature Flags 系统',
        items: [
          { text: 'Feature Flags 系统', link: '/2-feature-flags-system' }
        ]
      },
      {
        text: '构建系统',
        items: [
          { text: '构建系统与包分发', link: '/3-build-system-and-package-distribution' },
          { text: '构建流水线与模块分叉', link: '/3.1-build-pipeline-and-module-forking' },
          { text: '发布渠道与版本管理', link: '/3.2-release-channels-and-versioning' },
          { text: 'CI/CD 与产物管理', link: '/3.3-cicd-and-artifact-management' }
        ]
      },
      {
        text: 'React Reconciler',
        items: [
          { text: 'Reconciler 概述', link: '/4-react-reconciler' },
          { text: 'Fiber 架构与数据结构', link: '/4.1-fiber-architecture-and-data-structures' },
          { text: 'Work Loop 与渲染阶段', link: '/4.2-work-loop-and-rendering-phases' },
          { text: 'Hooks 系统', link: '/4.3-react-hooks-system' },
          { text: 'Lane 调度与优先级', link: '/4.4-lane-based-scheduling-and-priorities' },
          { text: 'Suspense 与错误边界', link: '/4.5-suspense-and-error-boundaries' },
          { text: 'Host Configuration 抽象', link: '/4.6-host-configuration-abstraction' },
          { text: '性能分析与追踪', link: '/4.7-profiling-and-performance-tracking' }
        ]
      },
      {
        text: '服务端渲染',
        items: [
          { text: 'SSR 概述', link: '/5-server-side-rendering' },
          { text: 'React Fizz (流式 SSR)', link: '/5.1-react-fizz-(streaming-ssr)' },
          { text: 'React Server Components (Flight)', link: '/5.2-react-server-components-(flight)' },
          { text: 'Server Components 构建集成', link: '/5.3-build-integration-for-server-components' },
          { text: 'Server Actions 与双向通信', link: '/5.4-server-actions-and-bidirectional-communication' }
        ]
      },
      {
        text: '平台实现',
        items: [
          { text: '平台实现概述', link: '/6-platform-implementations' },
          { text: 'React DOM 实现', link: '/6.1-react-dom-implementation' },
          { text: 'React Native 渲染器', link: '/6.2-react-native-renderers' },
          { text: 'Hydration 系统', link: '/6.3-hydration-system' },
          { text: 'View Transitions 与手势调度', link: '/6.4-view-transitions-and-gesture-scheduling' }
        ]
      },
      {
        text: '开发者工具',
        items: [
          { text: 'DevTools 概述', link: '/7-developer-tools-and-debugging' },
          { text: 'DevTools 架构', link: '/7.1-react-devtools-architecture' },
          { text: 'DevTools 分发与集成', link: '/7.2-devtools-distribution-and-integration' },
          { text: 'ESLint Plugin for Hooks', link: '/7.3-eslint-plugin-for-react-hooks' }
        ]
      }
    ],

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换'
            }
          }
        }
      }
    },

    outline: {
      label: '页面导航',
      level: [2, 3]
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    lastUpdated: {
      text: '最后更新于'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/facebook/react' }
    ],

    footer: {
      message: 'React 19 源码深度解析',
      copyright: '基于 VitePress 构建'
    }
  }
}))
