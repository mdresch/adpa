declare module 'frappe-gantt' {
  export interface GanttTask {
    id: string
    name: string
    start: string
    end: string
    progress: number
    dependencies?: string
    custom_class?: string
  }

  export interface GanttOptions {
    view_mode?: 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month'
    bar_height?: number
    bar_corner_radius?: number
    arrow_curve?: number
    padding?: number
    date_format?: string
    language?: string
    header_height?: number
    column_width?: number
    step?: number
    width?: string | number
    height?: number
    custom_popup_html?: (task: any) => string
  }

  export default class Gantt {
    constructor(element: HTMLElement, tasks: GanttTask[], options?: GanttOptions)
    change_view_mode(mode: string): void
    refresh(tasks: GanttTask[]): void
  }
}

