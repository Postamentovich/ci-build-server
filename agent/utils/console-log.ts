import chalk from 'chalk';

/**
 * Логирование ошибок в консоль
 *
 * @param message - сообщение
 */
export function errorLog(message: string) {
  console.log(chalk.bgRed(' ERROR '), chalk.red(message));
}

/**
 * Логирование информации в консоль
 *
 * @param message - сообщение
 */
export function infoLog(message: string) {
  console.log(chalk.bgBlue(' INFO '), message);
}

/**
 * Логирование предупреждений в консоль
 *
 * @param message - сообщение
 */
export function warningLog(message: string) {
  console.log(chalk.bgYellow(' WARNING '), message);
}
