const axios = require('axios').default;
const { infoLog } = require('../utils/console-log');
const { storageAPI } = require('../api/storage-api');

class BuildController {
  constructor() {
    // Список билдов в очереди
    this.buildList = [];
    // Список доступных агентов
    this.agents = [];

    this.processBuilds();
  }

  async processBuilds() {
    if (this.buildList[0] && this.getWaitingAgent()) {
      const build = this.buildList.shift();
      const agent = this.getWaitingAgent();

      await this.startBuild(build, agent);

      infoLog(`Build started at agent on ${agent.host}:${agent.port}`);

      this.processBuilds();
    } else {
      setTimeout(() => {
        this.processBuilds();
      }, 3000);
    }
  }

  async startBuild(build, agent) {
    const { buildId, repoName, commitHash, buildComand } = build;
    const model = { buildId, repoName, commitHash, buildComand };
    this.changeBuildAgentStatus(agent, 'Trying');
    await this.fetchAgentStartBuild(agent, model);
    this.changeBuildAgentStatus(agent, 'Working');
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
    const url = `${host}:${port}`;
    axios.post(url, model);
  }

  getWaitingAgent() {
    return this.agents.find((el) => el.status === 'Waiting');
  }

  findWaitingBuilds(data) {
    return data.filter(
      (el) => el.status === 'Waiting' && !this.buildList.find((item) => item.id === el.id),
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

  start() {
    infoLog('Build controller starting');
    this.getBuildList();
  }

  addAgent(port, host) {
    infoLog(`Add build agent at ${host}${port}`);
    this.buildList.push({ port, host, status: 'Waiting' });
  }

  addBuildResult(buildId, status, log) {
    infoLog(`Add result for build ${buildId}`);
  }
}

module.exports = BuildController;
