const axios = require('axios').default;
const { infoLog, errorLog } = require('../utils/console-log');
const { storageAPI } = require('../api/storage-api');

const BUILD_STATUS = {
  WAITING: 'Waiting',
  IN_PROGRESS: 'InProgress',
  FAIL: 'Fail',
  CANCELED: 'Canceled',
  SUCCESS: 'Success',
};

const AGENT_STATUS = {
  WAITING: 'Waiting',
  TRYING: 'Trying',
  WORKING: 'Working',
};

class BuildController {
  constructor() {
    // Список билдов в очереди
    this.buildList = [];
    // Список доступных агентов
    this.agents = [];
    // Настройки репозитория
    this.settings = null;
  }

  async processBuilds() {
    const hasWaitingAgent = await this.getWaitingAgent();

    if (this.buildList[0] && hasWaitingAgent) {
      const build = this.buildList.shift();
      const agent = await this.getWaitingAgent();

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
    infoLog(`Trying start build ${buildId} at agent on http://${agent.host}:${agent.port}`);
    this.changeBuildAgentStatus(agent, AGENT_STATUS.TRYING);
    try {
      await this.fetchAgentStartBuild(agent, model);
      this.changeBuildAgentStatus(agent, AGENT_STATUS.WORKING);
      this.fetchStorageBuildStart(buildId);
      infoLog(`Build ${buildId} started at agent on http://${agent.host}:${agent.port}`);
    } catch (error) {
      this.changeBuildAgentStatus(agent, AGENT_STATUS.WAITING);
      errorLog(`Failed starting build ${buildId} at agent on http://${agent.host}:${agent.port}`);
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

  async fetchStorageBuildStart(buildId) {
    await storageAPI.setBuildStart({
      buildId,
      dateTime: new Date().toISOString(),
    });
  }

  async fetchStorageBuildFinish(buildId, status, log) {
    try {
      await storageAPI.setBuildFinish({
        buildId,
        duration: 3000,
        success: status === BUILD_STATUS.SUCCESS,
        buildLog: log,
      });
    } catch (error) {
      errorLog(`Error when add result for build ${buildId}`);
      setTimeout(() => {
        this.fetchStorageBuildFinish(buildId, status, log);
      }, 1000);
    }
  }

  async fetchAgentHealth({ port, host }) {
    const url = `http://${host}:${port}/health`;
    return axios.get(url);
  }

  deleteAgent({ port, host }) {
    this.agents = this.agents.filter((el) => el.port !== port && el.host !== host);
  }

  async getWaitingAgent() {
    const agent = this.agents.find((el) => el.status === AGENT_STATUS.WAITING);
    if (agent) {
      try {
        await this.fetchAgentHealth(agent);
        return true;
      } catch (error) {
        errorLog(`Build agent at http://${host}:${port} not response`);
        this.deleteAgent(agent);
        return false;
      }
    }
    return false;
  }

  findWaitingBuilds(data) {
    return data.filter(
      (el) =>
        el.status === BUILD_STATUS.WAITING && !this.buildList.find((item) => item.id === el.id)
    );
  }

  async getBuildList() {
    try {
      const {
        data: { data },
      } = await storageAPI.getBuildList();

      const waitingBuilds = this.findWaitingBuilds(data);

      this.buildList = [...this.buildList, ...waitingBuilds];

      infoLog(`Found ${waitingBuilds.length} waiting builds`);
    } catch (error) {
      infoLog('Error when getting build list. Try in 10 seconds');
    } finally {
      setTimeout(() => {
        this.getBuildList();
      }, 10000);
    }
  }

  async getSettings() {
    try {
      infoLog('Get user settings');

      const {
        data: { data },
      } = await storageAPI.getConfig();

      if (data && data.repoName) {
        infoLog('User settings found');

        this.settings = data;

        this.processBuilds();
      } else {
        infoLog('User settings not found');
      }
    } catch (error) {
      errorLog('Error in getting initial settings. Try get settings in 5 secocnds');
      setTimeout(() => {
        this.getSettings();
      }, 5000);
    }
  }

  async start() {
    await this.getSettings();
    await this.getBuildList();
    infoLog('Build controller starting');
  }

  addAgent(port, host) {
    infoLog(`Add build agent at http://${host}:${port}`);
    if (this.agents.find((el) => el.port === port && el.host === host)) {
      this.changeBuildAgentStatus({ port, host }, AGENT_STATUS.WAITING);
    } else {
      this.agents.push({ port, host, status: AGENT_STATUS.WAITING });
    }
  }

  addBuildResult(buildId, status, log) {
    infoLog(`Add result for build ${buildId}`);
    this.fetchStorageBuildFinish(buildId, status, log);
  }
}

module.exports = BuildController;
