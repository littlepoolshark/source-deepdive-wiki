import { ref, computed } from 'vue'

export interface GithubCodeState {
  isOpen: boolean
  isLoading: boolean
  error: string | null
  code: string
  language: string
  filePath: string
  lineStart: number | null
  lineEnd: number | null
  githubUrl: string
  mode: 'drawer' | 'modal'
}

const state = ref<GithubCodeState>({
  isOpen: false,
  isLoading: false,
  error: null,
  code: '',
  language: 'typescript',
  filePath: '',
  lineStart: null,
  lineEnd: null,
  githubUrl: '',
  mode: 'drawer'
})

const LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  json: 'json',
  md: 'markdown',
  css: 'css',
  scss: 'scss',
  html: 'html',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'bash',
  bash: 'bash',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp'
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  return LANGUAGE_MAP[ext] || 'text'
}

function parseGithubUrl(url: string): {
  owner: string
  repo: string
  branch: string
  path: string
  lineStart: number | null
  lineEnd: number | null
} | null {
  // Match: https://github.com/owner/repo/blob/branch/path/to/file#L100-L200
  const match = url.match(
    /github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+?)(?:#L(\d+)(?:-L(\d+))?)?$/
  )
  
  if (!match) return null
  
  return {
    owner: match[1],
    repo: match[2],
    branch: match[3],
    path: match[4],
    lineStart: match[5] ? parseInt(match[5], 10) : null,
    lineEnd: match[6] ? parseInt(match[6], 10) : null
  }
}

async function fetchCode(url: string): Promise<void> {
  const parsed = parseGithubUrl(url)
  
  if (!parsed) {
    state.value.error = '无法解析 GitHub URL'
    return
  }
  
  state.value.isLoading = true
  state.value.error = null
  state.value.filePath = parsed.path
  state.value.lineStart = parsed.lineStart
  state.value.lineEnd = parsed.lineEnd
  state.value.githubUrl = url
  state.value.language = getLanguageFromPath(parsed.path)
  
  const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.branch}/${parsed.path}`
  
  try {
    const response = await fetch(rawUrl)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const text = await response.text()
    state.value.code = text
  } catch (err) {
    state.value.error = err instanceof Error ? err.message : '获取代码失败'
    state.value.code = ''
  } finally {
    state.value.isLoading = false
  }
}

export function useGithubCode() {
  const open = async (url: string) => {
    state.value.isOpen = true
    await fetchCode(url)
  }
  
  const close = () => {
    state.value.isOpen = false
    state.value.code = ''
    state.value.error = null
  }
  
  const toggleMode = () => {
    state.value.mode = state.value.mode === 'drawer' ? 'modal' : 'drawer'
  }
  
  const setMode = (mode: 'drawer' | 'modal') => {
    state.value.mode = mode
  }
  
  // Display the full code, not just the line range
  const displayedCode = computed(() => {
    return state.value.code || ''
  })
  
  // Line numbers starting from 1
  const lineNumbers = computed(() => {
    if (!state.value.code) return []
    
    const lines = state.value.code.split('\n')
    return lines.map((_, i) => i + 1)
  })
  
  // Check if a line is in the highlighted range
  const isLineHighlighted = (lineNum: number): boolean => {
    const start = state.value.lineStart
    const end = state.value.lineEnd
    
    if (start === null) return false
    
    const endLine = end ?? start
    return lineNum >= start && lineNum <= endLine
  }
  
  return {
    state,
    open,
    close,
    toggleMode,
    setMode,
    displayedCode,
    lineNumbers,
    isLineHighlighted
  }
}
