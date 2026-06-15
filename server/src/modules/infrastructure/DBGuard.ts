export class DBGuard {
  private static errorCount = 0;
  private static lastErrorTime = 0;
  private static readonly THRESHOLD = 15; // 15% / 15 errors
  private static readonly WINDOW_MS = 10000; // 10 seconds

  static recordError(err: Error): void {
    const now = Date.now();
    if (now - this.lastErrorTime > this.WINDOW_MS) {
      this.errorCount = 0;
    }
    this.errorCount++;
    this.lastErrorTime = now;
  }

  static isOpen(): boolean {
    const now = Date.now();
    if (now - this.lastErrorTime > this.WINDOW_MS) {
      this.errorCount = 0;
      return false;
    }
    return this.errorCount >= this.THRESHOLD;
  }

  static reset(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }
}
