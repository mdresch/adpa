/**
 * Lightweight notifications adapter for funneling notifications
 * into the existing NotificationCenter without coupling to a
 * specific toast library. Uses a global EventTarget so multiple
 * imports share the same bus in the browser.
 */

export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'room-joined'

export interface BaseNotification {
  title: string
  message: string
  description?: string
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, any>
  announce?: boolean
}

export interface SuccessNotification extends BaseNotification {
  type: 'success'
}

export interface ErrorNotification extends BaseNotification {
  type: 'error'
}

export interface InfoNotification extends BaseNotification {
  type: 'info'
}

export interface WarningNotification extends BaseNotification {
  type: 'warning'
}

export interface RoomJoinedNotification extends BaseNotification {
  type: 'room-joined'
}

/**
 * Payload for the application-wide notification bus.
 * Uses a discriminated union to allow for type-specific properties in the future.
 */
export type NotificationPayload =
  | SuccessNotification
  | ErrorNotification
  | InfoNotification
  | WarningNotification
  | RoomJoinedNotification

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
