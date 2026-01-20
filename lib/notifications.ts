/**
 * Lightweight notifications adapter for funneling notifications
 * into the existing NotificationCenter without coupling to a
 * specific toast library. Uses a global EventTarget so multiple
 * imports share the same bus in the browser.
 */

export type NotificationPayload = {
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, any>
  // whether to announce the notification to screen readers
  announce?: boolean
}

const EVENT_NAME = 'adpa:notification'

const globalKey = '__ADPA_NOTIFICATION_BUS_v1'
const bus: EventTarget = (globalThis as any)[globalKey] ?? new EventTarget()
if (!(globalThis as any)[globalKey]) {
  ;(globalThis as any)[globalKey] = bus
}

export function sendNotification(payload: NotificationPayload) {
  bus.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }))
}

export function onNotification(handler: (payload: NotificationPayload) => void) {
  const listener = (e: Event) => {
    const ev = e as CustomEvent<NotificationPayload>
    handler(ev.detail)
  }
  bus.addEventListener(EVENT_NAME, listener)
  return () => bus.removeEventListener(EVENT_NAME, listener)
}

export { EVENT_NAME }
