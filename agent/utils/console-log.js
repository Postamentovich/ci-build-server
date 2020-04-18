const chalk = require('chalk');

/**
 * Логирование ошибок в консоль
 *
 * @param {string} message - сообщение
 */
function errorLog(message) {
  console.log(chalk.bgRed(' ERROR '), chalk.red(message));
}

/**
 * Логирование информации в консоль
 *
 * @param {string} message - сообщение
 */
function infoLog(message) {
  console.log(chalk.bgBlue(' INFO '), message);
}

module.exports = {
  errorLog,
  infoLog,
};
