import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { onMounted, watch, nextTick, h } from 'vue'
import { useRoute } from 'vitepress'
import GithubCodeViewer from './components/GithubCodeViewer.vue'
import { useGithubCode } from './composables/useGithubCode'
import './custom.css'

const GITHUB_LINK_PATTERN = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/blob\//

function setupGithubLinkInterceptor() {
  const { open } = useGithubCode()
  
  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const link = target.closest('a')
    
    if (!link) return
    
    const href = link.getAttribute('href')
    if (!href) return
    
    // Check if it's a GitHub blob link
    if (GITHUB_LINK_PATTERN.test(href)) {
      e.preventDefault()
      e.stopPropagation()
      open(href)
    }
  }
  
  // Use event delegation on document
  document.addEventListener('click', handleClick, true)
  
  return () => {
    document.removeEventListener('click', handleClick, true)
  }
}

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => h(GithubCodeViewer)
    })
  },
  setup() {
    const route = useRoute()
    
    onMounted(() => {
      const cleanup = setupGithubLinkInterceptor()
      
      // Re-attach listener on route change (SPA navigation)
      watch(() => route.path, () => {
        nextTick(() => {
          // Links are already handled by event delegation
        })
      })
    })
  }
} satisfies Theme
