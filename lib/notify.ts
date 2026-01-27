import { sendNotification } from './notifications'

// Minimal local fallback for toast API to avoid hard dependency on `sonner` in CI/build.
// If `sonner` is present in node_modules the bundler will still pick it up when used elsewhere.
const sonnerToast = {
  success: (msg: string) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      try { (window as any).toast.success(msg) } catch { /* ignore */ }
    } else {
      // eslint-disable-next-line no-console
      console.log('[toast success]', msg)
    }
  },
  error: (msg: string) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      try { (window as any).toast.error(msg) } catch { /* ignore */ }
    } else {
      // eslint-disable-next-line no-console
      console.error('[toast error]', msg)
    }
  },
  // fallback callable
  default: (msg: string) => {
    // eslint-disable-next-line no-console
    console.log('[toast]', msg)
  }
}

type NotifyArgs = {
  title?: string
  message: string
  announce?: boolean
}

const wrap = (type: 'success' | 'error' | 'info' | 'warning') => (message: string, opts?: { title?: string; announce?: boolean; suppressAdapter?: boolean }) => {
  const title = opts?.title ?? (type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notification')
  const announce = opts?.announce ?? true
  
  // Filter out room join notifications - they should not appear as toasts
  const messageLower = message?.toLowerCase() || ''
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
      sendNotification({ type, title, message, announce })
    } catch (e) {
      // non-fatal
      // eslint-disable-next-line no-console
      console.warn('[notify] failed to send adapter notification', e)
    }
  }
  // show the toast using available adapter (or fallback)
  if (type === 'success') return sonnerToast.success(message)
  if (type === 'error') return sonnerToast.error(message)
  return sonnerToast.default(message)
}

export const toast = {
  success: wrap('success'),
  error: wrap('error'),
  info: wrap('info'),
  warning: wrap('warning'),
}

export default toast
