const { errorLog, infoLog } = require('../utils/console-log');
const axios = require('axios').default;
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { port, serverHost, serverPort } = require('../agent-conf.json');

const AGENT_PORT = typeof port === 'number' ? port : 8001;
const AGENT_HOST = '127.0.0.1';
const SERVER_HOST = typeof serverHost === 'string' ? serverHost : '127.0.0.1';
const SERVER_PORT = typeof serverPort === 'number' ? serverPort : 8080;

const BUILD_STATUS = {
  WAITING: 'Waiting',
  IN_PROGRESS: 'InProgress',
  FAIL: 'Fail',
  CANCELED: 'Canceled',
  SUCCESS: 'Success',
};
class AgentController {
  constructor() {
    this.storageFolderName = `storage-agent-repo`;
  }

  async run(command) {
    try {
      return exec(command);
    } catch (error) {
      return false;
    }
  }

  async removeLocalRepo() {
    infoLog('Remove local repo');

    const command = `rm -rf ${this.storageFolderName}`;

    await this.run(command);
  }

  async cloneRepo(repoName) {
    await this.removeLocalRepo();

    infoLog(`Clone repo ${repoName}`);

    const command = `git clone https://github.com/${repoName} ${this.storageFolderName}`;

    try {
      await this.run(command);
      infoLog(`Repo ${repoName} successfull clone`);
    } catch (error) {
      errorLog(`Error when clone Repo ${repoName}`);
    }
  }

  getServerUrl() {
    return `http://${SERVER_HOST}:${SERVER_PORT}`;
  }

  notifyServer() {
    const serverUrl = this.getServerUrl();
    const model = { port: AGENT_PORT, host: AGENT_HOST };
    try {
      axios.post(`${serverUrl}/notify-agent`, model);
    } catch (error) {
      errorLog(error);
    }
  }

  notifyServerBuildResult(status, log, buildId) {
    const serverUrl = this.getServerUrl();
    const model = { buildId, status, log };
    try {
      axios.post(`${serverUrl}/notify-build-result`, model);
    } catch (error) {
      errorLog(error);
    }
  }

  async buidRepo(buildCommand) {
    infoLog(`Start ${buildCommand}`);

    try {
      const { stdout } = await this.run(`cd ${this.storageFolderName} && ${buildCommand}`);

      infoLog('Build end successfull');

      return { log: stdout, status: BUILD_STATUS.SUCCESS };
    } catch (error) {
      errorLog(`Error in building`);
    }
  }

  checkout(commitHash) {
    infoLog(`Checkout to ${commitHash}`);

    const command = `cd ${this.storageFolderName} && git checkout ${commitHash}`;

    return this.run(command);
  }

  init() {
    infoLog('Build agent controller inited');
    this.notifyServer();
  }

  async build(buildId, repoName, commitHash, buildCommand) {
    this.buildId = buildId;
    await this.cloneRepo(repoName);
    await this.checkout(commitHash);
    const { status, log } = await this.buidRepo(buildCommand);
    await this.notifyServerBuildResult(status, log, buildId);
  }
}

module.exports = AgentController;
