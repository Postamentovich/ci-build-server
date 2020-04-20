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
    // Объект в котором по ключу билда хранятся время начала и конца сборки
    this.timers = {};
  }

  async processBuilds() {
    const hasWaitingAgent = await this.getWaitingAgent();
    infoLog(`Builds in queue ${this.buildList.length}`);
    infoLog(
      `Agents is waiting ${this.agents.filter((el) => el.status === AGENT_STATUS.WAITING).length}`,
    );

    if (this.buildList[0] && hasWaitingAgent) {
      const build = this.buildList.shift();
      const agent = await this.getWaitingAgent();

      await this.startBuild(build, agent);

      this.processBuilds();
    } else {
      setTimeout(() => {
        this.processBuilds();
      }, 5000);
    }
  }

  async startBuild(build, agent) {
    const { id: buildId, commitHash } = build;

    infoLog(`Trying start build ${buildId} at agent on http://${agent.host}:${agent.port}`);

    this.changeBuildAgentStatus(agent, AGENT_STATUS.TRYING);

    try {
      const settings = await this.getSettings();

      if (settings && settings.repoName && settings.buildCommand) {
        const { repoName, buildCommand } = settings;

        const model = { buildId, repoName, commitHash, buildCommand };

        await this.fetchAgentStartBuild(agent, model);

        this.changeBuildAgentStatus(agent, AGENT_STATUS.WORKING, build);

        await this.fetchStorageBuildStart(buildId);

        infoLog(`Build ${buildId} started at agent on http://${agent.host}:${agent.port}`);
      } else {
        this.changeBuildAgentStatus(agent, AGENT_STATUS.WAITING);

        this.buildList.push(build);
      }
    } catch (error) {
      this.changeBuildAgentStatus(agent, AGENT_STATUS.WAITING);

      this.buildList.push(build);

      errorLog(`Failed starting build ${buildId} at agent on http://${agent.host}:${agent.port}`);
    }
  }

  changeBuildAgentStatus(agent, status, build = null) {
    const { port, host } = agent;

    this.agents.forEach((el) => {
      if (el.port === port && el.host === host) {
        el.status = status;
        el.build = build;
      }
    });
  }

  async fetchAgentStartBuild(agent, model) {
    const { port, host } = agent;

    const url = `http://${host}:${port}/build`;

    axios.post(url, model);
  }

  async fetchStorageBuildStart(buildId) {
    try {
      const startDate = Date.now();
      await storageAPI.setBuildStart({
        buildId,
        dateTime: new Date(startDate).toISOString(),
      });

      this.timers[buildId] = { start: startDate };
    } catch (error) {
      errorLog(`Failed add to storage start info ${buildId}`);

      setTimeout(() => {
        this.fetchStorageBuildStart(buildId);
      }, 3000);
    }
  }

  async fetchStorageBuildFinish(buildId, status, log) {
    try {
      const { start, finish } = this.timers[buildId];

      await storageAPI.setBuildFinish({
        buildId,
        duration: finish - start,
        success: status === BUILD_STATUS.SUCCESS,
        buildLog: log,
      });
    } catch (error) {
      errorLog(`Error when add result for build ${buildId}`);

      setTimeout(() => {
        this.fetchStorageBuildFinish(buildId, status, log);
      }, 3000);
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

        return agent;
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
        el.status === BUILD_STATUS.WAITING && !this.buildList.find((item) => item.id === el.id),
    );
  }

  addBuildToQueue(build) {
    if (!this.buildList.find((el) => el.id !== build.id)) {
      this.buildList.push(build);
    }
  }

  async getBuildList() {
    try {
      const {
        data: { data },
      } = await storageAPI.getBuildList();

      const waitingBuilds = this.findWaitingBuilds(data);

      waitingBuilds.forEach((build) => {
        this.addBuildToQueue(build);
      });

      infoLog(`Found ${waitingBuilds.length} new waiting builds`);
    } catch (error) {
      errorLog('Error when getting build list. Try in 10 seconds');
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

        return data;
      } else {
        errorLog('User settings not found');
        return null;
      }
    } catch (error) {
      errorLog('Error in getting initial settings. Try get settings in 5 seconds');
      return null;
    }
  }

  async agentHealthChecking() {
    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      try {
        await this.fetchAgentHealth(agent);
      } catch (error) {
        this.deleteAgent(agent);
        if (agent.status === AGENT_STATUS.WORKING && agent.build) {
          this.buildList.push(agent.build);
        }
      }
    }
    setTimeout(() => {
      this.agentHealthChecking();
    }, 10000);
  }

  async start() {
    await this.getBuildList();

    this.processBuilds();

    this.agentHealthChecking();

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
    this.timers[buildId].finish = Date.now();
    this.fetchStorageBuildFinish(buildId, status, log);
  }
}

module.exports = BuildController;
