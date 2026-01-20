import { toast as sonnerToast } from 'sonner'
import { sendNotification } from './notifications'

type NotifyArgs = {
  title?: string
  message: string
  announce?: boolean
}

const wrap = (type: 'success' | 'error' | 'info' | 'warning') => (message: string, opts?: { title?: string; announce?: boolean; suppressAdapter?: boolean }) => {
  const title = opts?.title ?? (type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notification')
  const announce = opts?.announce ?? true
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
  // keep showing the toast during staged rollout
  if (type === 'success') return sonnerToast.success(message)
  if (type === 'error') return sonnerToast.error(message)
  return sonnerToast(message)
}

export const toast = {
  success: wrap('success'),
  error: wrap('error'),
  info: wrap('info'),
  warning: wrap('warning'),
}

export default toast
