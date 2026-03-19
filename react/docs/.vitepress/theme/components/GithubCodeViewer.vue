<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useGithubCode } from '../composables/useGithubCode'

const { state, close, toggleMode, displayedCode, lineNumbers, isLineHighlighted } = useGithubCode()

// Reference to the code content container for scrolling
const codeContentRef = ref<HTMLElement | null>(null)

// Drag state for modal
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const modalPosition = ref({ x: 0, y: 0 })
const modalRef = ref<HTMLElement | null>(null)

// Drawer resize state
const isResizing = ref(false)
const drawerWidth = ref(800) // Will be updated on mount
const MIN_DRAWER_WIDTH = 300
const MAX_DRAWER_WIDTH_RATIO = 0.8

const fileName = computed(() => {
  const parts = state.value.filePath.split('/')
  return parts[parts.length - 1]
})

const lineRange = computed(() => {
  if (state.value.lineStart === null) return ''
  if (state.value.lineEnd === null) return `L${state.value.lineStart}`
  return `L${state.value.lineStart}-L${state.value.lineEnd}`
})

const openInGithub = () => {
  window.open(state.value.githubUrl, '_blank')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && state.value.isOpen) {
    close()
  }
}


// Drag handlers for modal
const startDrag = (e: MouseEvent) => {
  if (state.value.mode !== 'modal' || !modalRef.value) return
  
  isDragging.value = true
  const rect = modalRef.value.getBoundingClientRect()
  dragOffset.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  const newX = e.clientX - dragOffset.value.x
  const newY = e.clientY - dragOffset.value.y
  
  // Constrain to viewport
  const maxX = window.innerWidth - (modalRef.value?.offsetWidth || 0)
  const maxY = window.innerHeight - (modalRef.value?.offsetHeight || 0)
  
  modalPosition.value = {
    x: Math.max(0, Math.min(newX, maxX)),
    y: Math.max(0, Math.min(newY, maxY))
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Resize handlers for drawer
let rafId: number | null = null
let pendingWidth: number | null = null
let savedScrollY = 0

const startResize = (e: MouseEvent) => {
  if (state.value.mode !== 'drawer') return
  
  e.preventDefault()
  isResizing.value = true
  savedScrollY = window.scrollY
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

const applyResize = () => {
  if (pendingWidth === null || typeof window === 'undefined') return
  
  drawerWidth.value = pendingWidth
  updateDrawerWidthVar()
  
  // Force synchronous layout calculation then restore scroll
  document.body.offsetHeight
  window.scrollTo(0, savedScrollY)
  
  pendingWidth = null
  rafId = null
}

const onResize = (e: MouseEvent) => {
  if (!isResizing.value || typeof window === 'undefined') return
  
  const maxWidth = window.innerWidth * MAX_DRAWER_WIDTH_RATIO
  const newWidth = window.innerWidth - e.clientX
  pendingWidth = Math.max(MIN_DRAWER_WIDTH, Math.min(newWidth, maxWidth))
  
  // Batch updates using requestAnimationFrame
  if (rafId === null) {
    rafId = requestAnimationFrame(applyResize)
  }
}

const stopResize = () => {
  // Cancel any pending RAF
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  
  // Apply final width if pending
  if (pendingWidth !== null) {
    drawerWidth.value = pendingWidth
    updateDrawerWidthVar()
    pendingWidth = null
  }
  
  // Final scroll restore
  window.scrollTo(0, savedScrollY)
  
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

const updateDrawerWidthVar = () => {
  document.documentElement.style.setProperty('--github-viewer-drawer-width', `${drawerWidth.value}px`)
}

const modalStyle = computed(() => {
  if (state.value.mode !== 'modal') return {}
  
  if (modalPosition.value.x === 0 && modalPosition.value.y === 0) {
    // Center position (initial)
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    }
  }
  
  return {
    top: `${modalPosition.value.y}px`,
    left: `${modalPosition.value.x}px`,
    transform: 'none'
  }
})

const drawerStyle = computed(() => {
  if (state.value.mode !== 'drawer') return {}
  return {
    width: `${drawerWidth.value}px`
  }
})

// Reset modal position when switching modes or reopening
watch(() => [state.value.isOpen, state.value.mode], () => {
  if (state.value.mode === 'modal') {
    modalPosition.value = { x: 0, y: 0 }
  }
})

// Scroll to highlighted line when code is loaded
watch(() => state.value.isLoading, (isLoading, wasLoading) => {
  if (wasLoading && !isLoading && state.value.code && state.value.lineStart !== null) {
    // Code just finished loading, scroll to the highlighted line
    setTimeout(() => {
      scrollToHighlightedLine()
    }, 100)
  }
})

const scrollToHighlightedLine = () => {
  if (!codeContentRef.value || state.value.lineStart === null) return
  
  const lineElement = codeContentRef.value.querySelector(`[data-line="${state.value.lineStart}"]`)
  if (lineElement) {
    lineElement.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

const updateBodyClasses = () => {
  if (typeof window === 'undefined') return
  
  if (state.value.isOpen && state.value.mode === 'drawer') {
    document.body.classList.add('github-viewer-drawer-open')
    updateDrawerWidthVar()
  } else {
    document.body.classList.remove('github-viewer-drawer-open')
  }
}

// Handle body class for drawer mode (to push content)
watch(() => state.value.isOpen, () => {
  updateBodyClasses()
})

watch(() => state.value.mode, () => {
  updateBodyClasses()
})

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  // Initialize drawer width based on window size
  if (typeof window !== 'undefined') {
    drawerWidth.value = Math.min(window.innerWidth * 0.5, 800)
  }
  updateDrawerWidthVar()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.classList.remove('github-viewer-drawer-open')
})

// Syntax highlighting using tokenizer approach
const highlightedLines = computed(() => {
  if (!displayedCode.value) return []
  
  const lang = state.value.language
  const lines = displayedCode.value.split('\n')
  
  return lines.map(line => highlightLine(line, lang))
})

interface Token {
  type: 'keyword' | 'string' | 'comment' | 'number' | 'function' | 'text'
  value: string
}

function tokenize(line: string, lang: string): Token[] {
  if (!['javascript', 'typescript', 'jsx', 'tsx', 'js', 'ts'].includes(lang)) {
    return [{ type: 'text', value: line }]
  }
  
  const tokens: Token[] = []
  let remaining = line
  
  const keywords = new Set([
    'import', 'export', 'from', 'default', 'const', 'let', 'var',
    'function', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally',
    'throw', 'new', 'class', 'extends', 'implements', 'interface',
    'type', 'enum', 'async', 'await', 'yield', 'static', 'public',
    'private', 'protected', 'readonly', 'abstract', 'as', 'is',
    'typeof', 'instanceof', 'in', 'of', 'void', 'null', 'undefined',
    'true', 'false', 'this', 'super', 'constructor', 'get', 'set',
    'opaque', 'declare'
  ])
  
  while (remaining.length > 0) {
    let matched = false
    
    // Single-line comment
    if (remaining.startsWith('//')) {
      tokens.push({ type: 'comment', value: remaining })
      break
    }
    
    // Multi-line comment start (handle partial)
    const multiCommentMatch = remaining.match(/^\/\*[\s\S]*?(\*\/|$)/)
    if (multiCommentMatch) {
      tokens.push({ type: 'comment', value: multiCommentMatch[0] })
      remaining = remaining.slice(multiCommentMatch[0].length)
      matched = true
      continue
    }
    
    // String literals
    for (const quote of ["'", '"', '`']) {
      if (remaining.startsWith(quote)) {
        let end = 1
        while (end < remaining.length) {
          if (remaining[end] === '\\' && end + 1 < remaining.length) {
            end += 2
            continue
          }
          if (remaining[end] === quote) {
            end++
            break
          }
          end++
        }
        tokens.push({ type: 'string', value: remaining.slice(0, end) })
        remaining = remaining.slice(end)
        matched = true
        break
      }
    }
    if (matched) continue
    
    // Numbers
    const numMatch = remaining.match(/^(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?)\b/)
    if (numMatch) {
      tokens.push({ type: 'number', value: numMatch[0] })
      remaining = remaining.slice(numMatch[0].length)
      continue
    }
    
    // Identifiers (keywords, functions, or plain text)
    const identMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/)
    if (identMatch) {
      const ident = identMatch[0]
      const afterIdent = remaining.slice(ident.length)
      
      // Check if it's a function call
      if (afterIdent.match(/^\s*\(/)) {
        tokens.push({ type: 'function', value: ident })
      } else if (keywords.has(ident)) {
        tokens.push({ type: 'keyword', value: ident })
      } else {
        tokens.push({ type: 'text', value: ident })
      }
      remaining = remaining.slice(ident.length)
      continue
    }
    
    // Other characters (operators, punctuation, whitespace)
    tokens.push({ type: 'text', value: remaining[0] })
    remaining = remaining.slice(1)
  }
  
  return tokens
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function highlightLine(line: string, lang: string): string {
  if (!line) return '&nbsp;'
  
  const tokens = tokenize(line, lang)
  
  return tokens.map(token => {
    const escaped = escapeHtml(token.value)
    switch (token.type) {
      case 'keyword':
        return `<span class="hl-keyword">${escaped}</span>`
      case 'string':
        return `<span class="hl-string">${escaped}</span>`
      case 'comment':
        return `<span class="hl-comment">${escaped}</span>`
      case 'number':
        return `<span class="hl-number">${escaped}</span>`
      case 'function':
        return `<span class="hl-function">${escaped}</span>`
      default:
        return escaped
    }
  }).join('')
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop for Modal mode -->
    <Transition name="fade">
      <div
        v-if="state.isOpen && state.mode === 'modal'"
        class="github-viewer-backdrop"
        @click="close"
      />
    </Transition>
    
    <!-- Main Container -->
    <Transition :name="state.mode === 'drawer' ? 'slide' : 'zoom'">
      <div
        v-if="state.isOpen"
        ref="modalRef"
        :class="['github-viewer', `github-viewer--${state.mode}`, { 'is-dragging': isDragging, 'is-resizing': isResizing }]"
        :style="state.mode === 'modal' ? modalStyle : drawerStyle"
      >
        <!-- Resize handle for drawer (left edge) -->
        <div
          v-if="state.mode === 'drawer'"
          class="github-viewer__resize-handle"
          @mousedown="startResize"
        />
        
        <!-- Header (draggable in modal mode) -->
        <div 
          class="github-viewer__header"
          :class="{ 'github-viewer__header--draggable': state.mode === 'modal' }"
          @mousedown="startDrag"
        >
          <div class="github-viewer__title">
            <span class="github-viewer__icon">📄</span>
            <span class="github-viewer__filename">{{ fileName }}</span>
            <span v-if="lineRange" class="github-viewer__lines">{{ lineRange }}</span>
          </div>
          
          <div class="github-viewer__actions" @mousedown.stop>
            <button
              class="github-viewer__btn github-viewer__btn--mode"
              @click="toggleMode"
              :title="state.mode === 'drawer' ? '切换到弹窗模式' : '切换到侧边栏模式'"
            >
              {{ state.mode === 'drawer' ? '⬜' : '▶️' }}
            </button>
            <button
              class="github-viewer__btn"
              @click="openInGithub"
              title="在 GitHub 中打开"
            >
              ↗️
            </button>
            <button
              class="github-viewer__btn github-viewer__btn--close"
              @click="close"
              title="关闭 (Esc)"
            >
              ✕
            </button>
          </div>
        </div>
        
        <!-- File Path -->
        <div class="github-viewer__path">
          {{ state.filePath }}
        </div>
        
        <!-- Content -->
        <div ref="codeContentRef" class="github-viewer__content">
          <!-- Loading -->
          <div v-if="state.isLoading" class="github-viewer__loading">
            <div class="github-viewer__spinner"></div>
            <span>加载中...</span>
          </div>
          
          <!-- Error -->
          <div v-else-if="state.error" class="github-viewer__error">
            <span>❌</span>
            <span>{{ state.error }}</span>
            <button @click="openInGithub" class="github-viewer__btn">
              在 GitHub 中查看
            </button>
          </div>
          
          <!-- Code with syntax highlighting -->
          <div v-else class="github-viewer__code">
            <table class="github-viewer__table">
              <tbody>
                <tr
                  v-for="(line, idx) in highlightedLines"
                  :key="idx"
                  :data-line="lineNumbers[idx]"
                  :class="['github-viewer__line', { 'github-viewer__line--highlighted': isLineHighlighted(lineNumbers[idx]) }]"
                >
                  <td class="github-viewer__line-number">
                    {{ lineNumbers[idx] }}
                  </td>
                  <td class="github-viewer__line-content">
                    <pre><code v-html="line"></code></pre>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.github-viewer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.github-viewer {
  position: fixed;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.github-viewer.is-dragging,
.github-viewer.is-resizing {
  user-select: none;
}

.github-viewer.is-dragging {
  cursor: grabbing;
}

.github-viewer.is-resizing {
  cursor: ew-resize;
}

/* Drawer Mode */
.github-viewer--drawer {
  top: 0;
  right: 0;
  height: 100vh;
  border-left: 2px solid var(--vp-c-brand-1);
}

/* Resize handle */
.github-viewer__resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s;
  z-index: 10;
}

.github-viewer__resize-handle:hover,
.github-viewer.is-resizing .github-viewer__resize-handle {
  background: var(--vp-c-brand-1);
}

/* Modal Mode */
.github-viewer--modal {
  width: min(80vw, 1000px);
  height: min(80vh, 800px);
  border-radius: 12px;
}

/* Header */
.github-viewer__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-border);
  flex-shrink: 0;
}

.github-viewer__header--draggable {
  cursor: grab;
}

.github-viewer__header--draggable:active {
  cursor: grabbing;
}

.github-viewer__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.github-viewer__icon {
  font-size: 18px;
}

.github-viewer__filename {
  color: var(--vp-c-text-1);
}

.github-viewer__lines {
  color: var(--vp-c-text-2);
  font-size: 0.85em;
  background: var(--vp-c-bg-mute);
  padding: 2px 8px;
  border-radius: 4px;
}

.github-viewer__actions {
  display: flex;
  gap: 8px;
}

.github-viewer__btn {
  padding: 6px 10px;
  border: none;
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.github-viewer__btn:hover {
  background: var(--vp-c-brand-soft);
}

.github-viewer__btn--close:hover {
  background: var(--vp-c-danger-soft);
}

/* Path */
.github-viewer__path {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-border);
  font-family: var(--vp-font-family-mono);
  flex-shrink: 0;
}

/* Content */
.github-viewer__content {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

/* Loading */
.github-viewer__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 16px;
  color: var(--vp-c-text-2);
}

.github-viewer__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--vp-c-border);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error */
.github-viewer__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  color: var(--vp-c-danger-1);
}

/* Code */
.github-viewer__code {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.6;
}

.github-viewer__table {
  width: 100%;
  border-collapse: collapse;
}

.github-viewer__line:hover {
  background: var(--vp-c-bg-soft);
}

/* Highlighted line range */
.github-viewer__line--highlighted {
  background: rgba(255, 235, 59, 0.15);
}

.github-viewer__line--highlighted:hover {
  background: rgba(255, 235, 59, 0.25);
}

.github-viewer__line--highlighted .github-viewer__line-number {
  background: rgba(255, 235, 59, 0.3);
  color: var(--vp-c-text-1);
  font-weight: 600;
}

/* Dark mode highlighted lines */
.dark .github-viewer__line--highlighted {
  background: rgba(255, 235, 59, 0.1);
}

.dark .github-viewer__line--highlighted:hover {
  background: rgba(255, 235, 59, 0.15);
}

.dark .github-viewer__line--highlighted .github-viewer__line-number {
  background: rgba(255, 235, 59, 0.2);
}

.github-viewer__line-number {
  width: 50px;
  padding: 0 12px;
  text-align: right;
  color: var(--vp-c-text-3);
  user-select: none;
  vertical-align: top;
  border-right: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
}

.github-viewer__line-content {
  padding: 0 16px;
  white-space: pre;
  overflow-x: auto;
}

.github-viewer__line-content pre {
  margin: 0;
  padding: 0;
}

.github-viewer__line-content code {
  font-family: inherit;
}

/* Syntax Highlighting Colors */
.github-viewer__line-content :deep(.hl-keyword) {
  color: #cf222e;
}

.github-viewer__line-content :deep(.hl-string) {
  color: #0a3069;
}

.github-viewer__line-content :deep(.hl-comment) {
  color: #6e7781;
  font-style: italic;
}

.github-viewer__line-content :deep(.hl-number) {
  color: #0550ae;
}

.github-viewer__line-content :deep(.hl-function) {
  color: #8250df;
}

/* Dark mode syntax highlighting */
.dark .github-viewer__line-content :deep(.hl-keyword) {
  color: #ff7b72;
}

.dark .github-viewer__line-content :deep(.hl-string) {
  color: #a5d6ff;
}

.dark .github-viewer__line-content :deep(.hl-comment) {
  color: #8b949e;
}

.dark .github-viewer__line-content :deep(.hl-number) {
  color: #79c0ff;
}

.dark .github-viewer__line-content :deep(.hl-function) {
  color: #d2a8ff;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.zoom-enter-active,
.zoom-leave-active {
  transition: all 0.2s ease;
}

.zoom-enter-from,
.zoom-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.9);
}

/* Responsive */
@media (max-width: 768px) {
  .github-viewer--drawer {
    width: 100vw !important;
  }
  
  .github-viewer__resize-handle {
    display: none;
  }
  
  .github-viewer--modal {
    width: 95vw;
    height: 90vh;
  }
}
</style>
