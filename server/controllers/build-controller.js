const axios = require("axios").default;
const { infoLog, errorLog } = require("../utils/console-log");
const { storageAPI } = require("../api/storage-api");

const BUILD_STATUS = {
  WAITING: "Waiting",
  IN_PROGRESS: "InProgress",
  FAIL: "Fail",
  CANCELED: "Canceled",
  SUCCESS: "Success",
};

const AGENT_STATUS = {
  WAITING: "Waiting",
  TRYING: "Trying",
  WORKING: "Working",
};

class BuildController {
  constructor() {
    // Список билдов в очереди
    this.buildList = [];
    // Список доступных агентов
    this.agents = [];

    this.settings = null;
  }

  async processBuilds() {
    if (this.buildList[0] && this.getWaitingAgent()) {
      const build = this.buildList.shift();
      const agent = this.getWaitingAgent();

      await this.startBuild(build, agent);

      this.processBuilds();
    } else {
      setTimeout(() => {
        this.processBuilds();
      }, 3000);
    }
  }

  async startBuild(build, agent) {
    const { id: buildId, commitHash } = build;
    const { repoName, buildCommand } = this.settings;
    const model = { buildId, repoName, commitHash, buildCommand };
    infoLog(this.buildList);
    infoLog(
      `Trying start build ${buildId} at agent on http://${agent.host}:${agent.port}`
    );
    this.changeBuildAgentStatus(agent, AGENT_STATUS.TRYING);
    try {
      await this.fetchAgentStartBuild(agent, model);
      this.changeBuildAgentStatus(agent, AGENT_STATUS.WORKING);
      infoLog(
        `Build ${buildId} started at agent on http://${agent.host}:${agent.port}`
      );
    } catch (error) {
      this.changeBuildAgentStatus(agent, AGENT_STATUS.WAITING);
      errorLog(
        `Failed starting build ${buildId} at agent on http://${agent.host}:${agent.port}`
      );
    }
  }

  changeBuildAgentStatus(agent, status) {
    const { port, host } = agent;
    this.agents.forEach((el) => {
      if (el.port === port && el.host === host) {
        el.status = status;
      }
    });
  }

  async fetchAgentStartBuild(agent, model) {
    const { port, host } = agent;
    const url = `http://${host}:${port}/build`;
    axios.post(url, model);
  }

  getWaitingAgent() {
    return this.agents.find((el) => el.status === AGENT_STATUS.WAITING);
  }

  findWaitingBuilds(data) {
    return data.filter(
      (el) =>
        el.status === BUILD_STATUS.WAITING &&
        !this.buildList.find((item) => item.id === el.id)
    );
  }

  async getBuildList() {
    const {
      data: { data },
    } = await storageAPI.getBuildList();

    const waitingBuilds = this.findWaitingBuilds(data);

    this.buildList = [...this.buildList, ...waitingBuilds];

    infoLog(`Found ${waitingBuilds.length} waiting builds`);
  }

  async getSettings() {
    try {
      infoLog("Get user settings");

      const {
        data: { data },
      } = await storageAPI.getConfig();

      if (data && data.repoName) {
        infoLog("User settings found");

        this.settings = data;
      } else {
        infoLog("User settings not found");
      }
    } catch (error) {
      errorLog("Error in getting initial settings");
    }
  }

  async start() {
    await this.getSettings();
    if (this.settings) {
      infoLog("Build controller starting");
      await this.getBuildList();
      this.processBuilds();
    }
  }

  addAgent(port, host) {
    infoLog(`Add build agent at http://${host}:${port}`);
    this.agents.push({ port, host, status: AGENT_STATUS.WAITING });
  }

  addBuildResult(buildId, status, log) {
    infoLog(`Add result for build ${buildId}`);
  }
}

module.exports = BuildController;
