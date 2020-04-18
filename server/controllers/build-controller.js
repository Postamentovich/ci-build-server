const { errorLog, infoLog } = require('../utils/console-log');

class BuildController {
  constructor() {}

  start() {
    infoLog('Build controller starting');
  }

  addAgent(port, host) {
    infoLog(`Add build agent at ${host}${port}`);
  }

  addBuildResult(buildId, status, log) {
    infoLog(`Add result for build ${buildId}`);
  }
}

module.exports = BuildController;
