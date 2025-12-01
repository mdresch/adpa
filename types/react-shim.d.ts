// Short-term shim for missing React helper types in this repository.
// This file is intended as a temporary diagnostic-reduction measure.
// Replace by installing/aligning `@types/react` for a long-term fix.

declare module "react" {
  // Common helpers used across the codebase
  export function forwardRef(...args: any[]): any
  export type ComponentProps<T extends keyof JSX.IntrinsicElements> = any
  export type ComponentPropsWithoutRef<T> = any
  export type ElementRef<T> = any
  export type ForwardedRef<T> = any
  export type CSSProperties = { [k: string]: any }
  export type ReactElement = any

  // Common hooks used
  export const useMemo: any
  export const useCallback: any
  export const useState: any
  export const useRef: any
  export const useContext: any
  export const createContext: any
  export const Fragment: any

  const React: any
  export default React
}

// Also expose a global React namespace for files that rely on global JSX types.
declare global {
  namespace React {
    // mirror some conveniences
    type ComponentProps<T extends keyof JSX.IntrinsicElements> = any
    type ComponentPropsWithoutRef<T> = any
    type ElementRef<T> = any
    type ForwardedRef<T> = any
    type CSSProperties = { [k: string]: any }
    type ReactElement = any
  }
}
