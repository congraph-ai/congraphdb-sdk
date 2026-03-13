/**
 * Logger utility for colored and formatted console output
 * Makes example output more readable and organized
 */

import chalk from 'chalk';

type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'dim';

export class Logger {
  private section: string;
  private verbose: boolean;

  constructor(section: string, verbose: boolean = false) {
    this.section = section;
    this.verbose = verbose;
  }

  /**
   * Print a section header
   */
  header(title: string): void {
    console.log('');
    console.log(chalk.bgBlue.white.bold(` ${title} `));
    console.log(chalk.blue('─'.repeat(50)));
  }

  /**
   * Print a subsection title
   */
  subheader(title: string): void {
    console.log('');
    console.log(chalk.cyan.bold(`● ${title}`));
  }

  /**
   * Log an informational message
   */
  info(message: string): void {
    this.log(message, 'info');
  }

  /**
   * Log a success message
   */
  success(message: string): void {
    this.log(message, 'success');
  }

  /**
   * Log a warning message
   */
  warning(message: string): void {
    this.log(message, 'warning');
  }

  /**
   * Log an error message
   */
  error(message: string): void {
    this.log(message, 'error');
  }

  /**
   * Log a dimmed/secondary message
   */
  dim(message: string): void {
    this.log(message, 'dim');
  }

  /**
   * Verbose logging (only shown when verbose mode is enabled)
   */
  verboseLog(message: string): void {
    if (this.verbose) {
      this.dim(`  [VERBOSE] ${message}`);
    }
  }

  /**
   * Log a query being executed
   */
  query(query: string): void {
    this.verboseLog(`Query: ${query}`);
  }

  /**
   * Log query results
   */
  result(count: number, label: string = 'results'): void {
    this.success(`✓ Found ${count} ${label}`);
  }

  /**
   * Log a data value (for debugging/learning)
   */
  data(label: string, value: any): void {
    this.dim(`  ${label}: ${JSON.stringify(value, null, 2)}`);
  }

  /**
   * Print a code snippet
   */
  code(code: string): void {
    console.log(chalk.gray(`  ${code}`));
  }

  /**
   * Print an example's expected output
   */
  expectedOutput(output: string): void {
    console.log('');
    this.dim('Expected output:');
    console.log(chalk.gray(`  ${output}`));
  }

  /**
   * Internal log method with color formatting
   */
  private log(message: string, level: LogLevel): void {
    const prefix = chalk.dim(`[${this.section}]`);
    let coloredMessage: string;

    switch (level) {
      case 'info':
        coloredMessage = chalk.blue(message);
        break;
      case 'success':
        coloredMessage = chalk.green(message);
        break;
      case 'warning':
        coloredMessage = chalk.yellow(message);
        break;
      case 'error':
        coloredMessage = chalk.red(message);
        break;
      case 'dim':
        coloredMessage = chalk.gray(message);
        break;
    }

    console.log(`${prefix} ${coloredMessage}`);
  }

  /**
   * Print a separator line
   */
  separator(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }

  /**
   * Print an empty line
   */
  newline(): void {
    console.log('');
  }
}

/**
 * Create a logger for a specific section
 */
export function createLogger(section: string, verbose?: boolean): Logger {
  return new Logger(section, verbose ?? false);
}
