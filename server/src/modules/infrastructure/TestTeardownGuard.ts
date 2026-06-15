export class TestTeardownGuard {
  private static handles: Set<string> = new Set();

  static registerHandle(id: string): void {
    this.handles.add(id);
  }

  static releaseHandle(id: string): void {
    this.handles.delete(id);
  }

  static getOpenHandlesCount(): number {
    return this.handles.size;
  }

  static reset(): void {
    this.handles.clear();
  }
}
