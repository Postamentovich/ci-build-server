const { errorLog, infoLog } = require("../utils/console-log");
const axios = require("axios").default;
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { port, serverHost, serverPort } = require("../agent-conf.json");

const AGENT_PORT = typeof port === "number" ? port : 8001;
const AGENT_HOST = "127.0.0.1";
const SERVER_HOST = typeof serverHost === "string" ? serverHost : "127.0.0.1";
const SERVER_PORT = typeof serverPort === "number" ? serverPort : 8080;

class AgentController {
  constructor() {
    this.storageFolderName = `storage-agent-${AGENT_PORT}`;
  }

  /**
   * Выполнение комманды
   * @param {string} command
   */
  async run(command) {
    try {
      return exec(command);
    } catch (error) {
      return false;
    }

  }

  cloneRepo() {}

  notifyServer() {
    const serverUrl = `http://${SERVER_HOST}:${SERVER_PORT}/notify-agent`;
    infoLog(serverUrl);
    const model = { port: AGENT_PORT, host: AGENT_HOST };
    try {
      axios.post(serverUrl, model);
    } catch (error) {
      errorLog(error);
    }
  }

  init() {
    infoLog("Build agent controller inited");
    this.notifyServer();
  }

  build(buildId, repoName, commitHash, buildCommand) {
    infoLog(`buildId ${buildId}`);
    infoLog(`repoName ${repoName}`);
    infoLog(`commitHash ${commitHash}`);
    infoLog(`buildCommand ${buildCommand}`);
  }
}

module.exports = AgentController;
