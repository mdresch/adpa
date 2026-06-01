import { sendNotification } from './notifications'
import { toast as realSonnerToast } from 'sonner'

// Set global toast reference in browser for any legacy modules
if (typeof window !== 'undefined') {
  ;(window as any).toast = realSonnerToast
}

// Minimal local fallback for toast API to avoid hard dependency on `sonner` in CI/build.
// If `sonner` is present in node_modules the bundler will still pick it up when used elsewhere.
const sonnerToast = {
  success: (msg: string, description?: string) => {
    if (typeof window !== 'undefined') {
      try { realSonnerToast.success(msg, { description }) } catch { /* ignore */ }
    } else {
      // eslint-disable-next-line no-console
      console.log('[toast success]', msg, description ? `(${description})` : '')
    }
  },
  error: (msg: string, description?: string) => {
    if (typeof window !== 'undefined') {
      try { realSonnerToast.error(msg, { description }) } catch { /* ignore */ }
    } else {
      // eslint-disable-next-line no-console
      console.error('[toast error]', msg, description ? `(${description})` : '')
    }
  },
  loading: (msg: string, description?: string) => {
    if (typeof window !== 'undefined') {
      try { realSonnerToast.loading(msg, { description }) } catch { /* ignore */ }
    } else {
      // eslint-disable-next-line no-console
      console.log('[toast loading]', msg, description ? `(${description})` : '')
    }
  },
  // fallback callable
  default: (msg: string, description?: string) => {
    if (typeof window !== 'undefined') {
      try { realSonnerToast(msg, { description }) } catch { /* ignore */ }
    } else {
      // eslint-disable-next-line no-console
      console.log('[toast]', msg, description ? `(${description})` : '')
    }
  }
}


export interface ToastOptions {
  title?: string
  description?: string
  announce?: boolean
  suppressAdapter?: boolean
  duration?: number
}

const wrap = (type: 'success' | 'error' | 'info' | 'warning' | 'loading') => (message: string, opts?: ToastOptions) => {
  let displayMessage = message
  let displayTitle = opts?.title ?? (type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notification')
  
  if (message && typeof message === 'string' && message.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(message)
      if (parsed.message) {
        displayMessage = parsed.message
      }
      if (parsed.error === 'GOVERNANCE_LOCKOUT') {
        displayTitle = opts?.title ?? 'Governance Blocked'
      }
    } catch (_) {
      // ignore
    }
  }

  const title = displayTitle
  const description = opts?.description
  const announce = opts?.announce ?? true
  
  // Filter out room join notifications - they should not appear as toasts
  const messageLower = displayMessage?.toLowerCase() || ''
  const titleLower = title?.toLowerCase() || ''
  const combined = `${messageLower} ${titleLower}`.toLowerCase()
  
  if (combined.includes('joined') || 
      combined.includes('realtime rooms') ||
      combined.includes('realtime') ||
      titleLower.includes('realtime rooms') ||
      messageLower.includes('joined room')) {
    // Silently ignore room join notifications - they're handled by RoomStatusList
    return
  }
  
  // send to notifications center unless explicitly suppressed
  if (!opts?.suppressAdapter) {
    try {
      sendNotification({ type, title, message: displayMessage, description, announce })
    } catch (e) {
      // non-fatal
      // eslint-disable-next-line no-console
      console.warn('[notify] failed to send adapter notification', e)
    }
  }
  // show the toast using available adapter (or fallback)
  if (type === 'success') return sonnerToast.success(displayMessage, description)
  if (type === 'error') return sonnerToast.error(displayMessage, description)
  if (type === 'loading') return sonnerToast.loading(displayMessage, description)
  return sonnerToast.default(displayMessage, description)
}

export const toast = {
  success: wrap('success'),
  error: wrap('error'),
  info: wrap('info'),
  warning: wrap('warning'),
  loading: wrap('loading'),
}

export default toast
