---
layout: home

hero:
  name: React 19
  text: 源码深度解析
  tagline: 深入理解 React 19 核心架构与实现原理
  actions:
    - theme: brand
      text: 开始阅读
      link: /1-overview
    - theme: alt
      text: GitHub
      link: https://github.com/facebook/react

features:
  - icon: 🏗️
    title: Fiber 架构
    details: 深入理解 React Fiber 数据结构、Work Loop 渲染机制和 Lane 优先级调度系统
    link: /4-react-reconciler
  - icon: ⚡
    title: Hooks 系统
    details: 探索 React Hooks 的内部实现原理，理解 useState、useEffect 等核心 Hook 的工作机制
    link: /4.3-react-hooks-system
  - icon: 🌊
    title: 流式 SSR
    details: 了解 React Fizz 流式渲染引擎和 Suspense 如何实现渐进式服务端渲染
    link: /5.1-react-fizz-(streaming-ssr)
  - icon: 🚀
    title: Server Components
    details: 掌握 React Server Components (Flight) 协议和 Server Actions 双向通信机制
    link: /5.2-react-server-components-(flight)
  - icon: 🎯
    title: 平台抽象
    details: 理解 React 的跨平台渲染架构，包括 DOM、Native 和 Hydration 系统
    link: /6-platform-implementations
  - icon: 🛠️
    title: 开发者工具
    details: 探索 React DevTools 的架构设计和调试能力
    link: /7-developer-tools-and-debugging
---

## 文档结构

本文档基于 React 19 源码，系统性地解析了 React 的核心架构与实现原理，涵盖以下主题：

| 章节 | 内容 |
|------|------|
| **概述** | 仓库结构、包组织、Feature Flags 系统 |
| **构建系统** | 构建流水线、模块分叉、发布渠道、CI/CD |
| **Reconciler** | Fiber 架构、Work Loop、Hooks、调度、Suspense |
| **服务端渲染** | Fizz 流式 SSR、Server Components、Server Actions |
| **平台实现** | DOM、Native、Hydration、View Transitions |
| **开发者工具** | DevTools 架构、ESLint 插件 |
