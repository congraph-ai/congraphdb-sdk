/**
 * Timer utility for measuring and displaying operation duration
 */

import chalk from 'chalk';

export class Timer {
  private startTime: bigint;
  private label: string;

  constructor(label: string = 'Operation') {
    this.label = label;
    this.startTime = process.hrtime.bigint();
  }

  /**
   * Stop the timer and return elapsed milliseconds
   */
  stop(): number {
    const endTime = process.hrtime.bigint();
    const elapsedNanos = Number(endTime - this.startTime);
    return elapsedNanos / 1000000; // Convert to milliseconds
  }

  /**
   * Stop the timer and log the result
   */
  stopAndLog(): string {
    const elapsed = this.stop();
    const formatted = this.formatTime(elapsed);
    console.log(chalk.dim(`  ⏱  ${this.label}: ${formatted}`));
    return formatted;
  }

  /**
   * Format time in a human-readable way
   */
  private formatTime(ms: number): string {
    if (ms < 1) {
      return `${(ms * 1000).toFixed(2)}μs`;
    } else if (ms < 1000) {
      return `${ms.toFixed(2)}ms`;
    } else {
      const seconds = ms / 1000;
      return `${seconds.toFixed(2)}s`;
    }
  }

  /**
   * Create a timer that starts immediately
   */
  static start(label: string = 'Operation'): Timer {
    return new Timer(label);
  }
}

/**
 * Measure the execution time of an async function
 */
export async function measureTime<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: string }> {
  const timer = Timer.start(label);
  const result = await fn();
  const duration = timer.stopAndLog();
  return { result, duration };
}

/**
 * Measure the execution time of a sync function
 */
export function measureTimeSync<T>(
  label: string,
  fn: () => T
): { result: T; duration: string } {
  const timer = Timer.start(label);
  const result = fn();
  const duration = timer.stopAndLog();
  return { result, duration };
}
