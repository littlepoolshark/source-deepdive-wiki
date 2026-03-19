<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useGithubCode } from '../composables/useGithubCode'

const { state, close, toggleMode, displayedCode, lineNumbers } = useGithubCode()

// Drag state for modal
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const modalPosition = ref({ x: 0, y: 0 })
const modalRef = ref<HTMLElement | null>(null)

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

// Reset modal position when switching modes or reopening
watch(() => [state.value.isOpen, state.value.mode], () => {
  if (state.value.mode === 'modal') {
    modalPosition.value = { x: 0, y: 0 }
  }
})

// Handle body class for drawer mode (to push content)
watch(() => state.value.isOpen, (isOpen) => {
  if (isOpen && state.value.mode === 'drawer') {
    document.body.classList.add('github-viewer-drawer-open')
  } else {
    document.body.classList.remove('github-viewer-drawer-open')
  }
})

watch(() => state.value.mode, (mode) => {
  if (state.value.isOpen) {
    if (mode === 'drawer') {
      document.body.classList.add('github-viewer-drawer-open')
    } else {
      document.body.classList.remove('github-viewer-drawer-open')
    }
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.classList.remove('github-viewer-drawer-open')
})

// Syntax highlighting using simple token-based approach
const highlightedLines = computed(() => {
  if (!displayedCode.value) return []
  
  const lang = state.value.language
  const lines = displayedCode.value.split('\n')
  
  return lines.map(line => highlightLine(line, lang))
})

function highlightLine(line: string, lang: string): string {
  if (!line) return '&nbsp;'
  
  // Escape HTML first
  let escaped = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // JavaScript/TypeScript highlighting
  if (['javascript', 'typescript', 'jsx', 'tsx', 'js', 'ts'].includes(lang)) {
    // Comments
    escaped = escaped.replace(
      /(\/\/.*$)/gm,
      '<span class="hl-comment">$1</span>'
    )
    escaped = escaped.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      '<span class="hl-comment">$1</span>'
    )
    
    // Strings
    escaped = escaped.replace(
      /(&apos;[^&apos;]*&apos;|&quot;[^&quot;]*&quot;|`[^`]*`)/g,
      '<span class="hl-string">$1</span>'
    )
    escaped = escaped.replace(
      /('[^']*'|"[^"]*")/g,
      '<span class="hl-string">$1</span>'
    )
    
    // Keywords
    const keywords = [
      'import', 'export', 'from', 'default', 'const', 'let', 'var',
      'function', 'return', 'if', 'else', 'for', 'while', 'do',
      'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally',
      'throw', 'new', 'class', 'extends', 'implements', 'interface',
      'type', 'enum', 'async', 'await', 'yield', 'static', 'public',
      'private', 'protected', 'readonly', 'abstract', 'as', 'is',
      'typeof', 'instanceof', 'in', 'of', 'void', 'null', 'undefined',
      'true', 'false', 'this', 'super', 'constructor', 'get', 'set'
    ]
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
    escaped = escaped.replace(keywordRegex, '<span class="hl-keyword">$1</span>')
    
    // Numbers
    escaped = escaped.replace(
      /\b(\d+\.?\d*)\b/g,
      '<span class="hl-number">$1</span>'
    )
    
    // Function calls
    escaped = escaped.replace(
      /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
      '<span class="hl-function">$1</span>('
    )
  }
  
  return escaped
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
        :class="['github-viewer', `github-viewer--${state.mode}`, { 'is-dragging': isDragging }]"
        :style="state.mode === 'modal' ? modalStyle : {}"
      >
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
        <div class="github-viewer__content">
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
                  class="github-viewer__line"
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

.github-viewer.is-dragging {
  user-select: none;
  cursor: grabbing;
}

/* Drawer Mode */
.github-viewer--drawer {
  top: 0;
  right: 0;
  width: min(50vw, 800px);
  height: 100vh;
  border-left: 2px solid var(--vp-c-brand-1);
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
    width: 100vw;
  }
  
  .github-viewer--modal {
    width: 95vw;
    height: 90vh;
  }
}
</style>
