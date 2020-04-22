// tslint:disable: variable-name
import axios from 'axios';
import { storageAPI } from '../api/storage-api';
import { errorLog, infoLog } from '../utils/console-log';
import { IBuildModel, AgentStatus, BuildStatus, IBuildResult } from './../models';

export interface IAgent {
  status: AgentStatus;
  port: number;
  host: string;
  build?: IBuildModel;
}

export interface IAgentTimers {
  [key: string]: { start?: number; finish?: number };
}

export interface IAgentStartBuild {
  buildId: string;
  repoName: string;
  commitHash: string;
  buildCommand: string;
}

export default class BuildController {
  // Список билдов в очереди
  private buildList: IBuildModel[] = [];
  // Список доступных агентов
  private agents: IAgent[] = [];
  // Объект в котором по ключу билда хранятся время начала и конца сборки
  private timers: IAgentTimers = {};
  // Таймаут перзапроса
  private retryTimeout = 10000;

  public async start() {
    await this.getBuildList();

    this.processBuilds();

    this.agentHealthChecking();

    infoLog('Build controller starting');
  }

  public addAgent(port: number, host: string) {
    infoLog(`Add build agent at http://${host}:${port}`);

    const agent = this.agents.find((el) => el.port === port && el.host === host);

    if (agent) {
      this.changeBuildAgentStatus(agent, AgentStatus.Waiting);
    } else {
      this.agents.push({ port, host, status: AgentStatus.Waiting });
    }
  }

  public addBuildResult(buildId: string, status: BuildStatus, log: string) {
    infoLog(`Add result for build ${buildId}`);

    this.timers[buildId].finish = Date.now();

    this.fetchStorageBuildFinish(buildId, status, log);
  }

  private async processBuilds() {
    const hasWaitingAgent = await this.getWaitingAgent();

    infoLog(`Builds in queue ${this.buildList.length}`);

    infoLog(
      `Agents pending ${this.agents.filter((el) => el.status === AgentStatus.Waiting).length}`,
    );

    if (this.buildList[0] && hasWaitingAgent) {
      const build = this.buildList.shift();

      const agent = await this.getWaitingAgent();

      if (agent && build) {
        await this.startBuild(build, agent);
      }

      this.processBuilds();
    } else {
      setTimeout(() => {
        this.processBuilds();
      }, this.retryTimeout);
    }
  }

  private async startBuild(build: IBuildModel, agent: IAgent) {
    const { id: buildId, commitHash } = build;

    infoLog(`Trying start build ${buildId} at agent on http://${agent.host}:${agent.port}`);

    this.changeBuildAgentStatus(agent, AgentStatus.Trying);

    try {
      const settings = await this.getSettings();

      if (settings && settings.repoName && settings.buildCommand) {
        const { repoName, buildCommand } = settings;

        const model: IAgentStartBuild = { buildId, repoName, commitHash, buildCommand };

        await this.fetchAgentStartBuild(agent, model);

        this.changeBuildAgentStatus(agent, AgentStatus.Waiting, build);

        await this.fetchStorageBuildStart(buildId);

        infoLog(`Build ${buildId} started at agent on http://${agent.host}:${agent.port}`);
      } else {
        this.changeBuildAgentStatus(agent, AgentStatus.Waiting);

        this.buildList.push(build);
      }
    } catch (error) {
      this.changeBuildAgentStatus(agent, AgentStatus.Waiting);

      this.buildList.push(build);

      errorLog(`Failed starting build ${buildId} at agent on http://${agent.host}:${agent.port}`);
    }
  }

  private changeBuildAgentStatus(agent: IAgent, status: AgentStatus, build?: IBuildModel) {
    const { port, host } = agent;

    this.agents.forEach((el) => {
      if (el.port === port && el.host === host) {
        el.status = status;
        el.build = build;
      }
    });
  }

  private async fetchAgentStartBuild(agent: IAgent, model: IAgentStartBuild) {
    const { port, host } = agent;

    const url = `http://${host}:${port}/build`;

    await axios.post(url, model);
  }

  private async fetchStorageBuildStart(buildId: string) {
    try {
      const startDate = Date.now();
      await storageAPI.setBuildStart({
        buildId,
        dateTime: new Date(startDate).toISOString(),
      });

      this.timers[buildId] = { start: startDate };
    } catch (error) {
      errorLog(`${error}`);
      errorLog(`Failed add to storage start info ${buildId}`);

      setTimeout(() => {
        const id = buildId;
        this.fetchStorageBuildStart(id);
      }, this.retryTimeout);
    }
  }

  private async fetchStorageBuildFinish(buildId: string, status: BuildStatus, log: string) {
    try {
      const { start, finish } = this.timers[buildId];

      await storageAPI.setBuildFinish({
        buildId,
        buildLog: log,
        duration: finish! - start!,
        success: status === BuildStatus.Success,
      });
    } catch (error) {
      errorLog(`${error}`);
      errorLog(`Error when add result for build ${buildId}`);

      setTimeout(() => {
        const _buildId = buildId;
        const _status = status;
        const _log = log;
        this.fetchStorageBuildFinish(_buildId, _status, _log);
      }, this.retryTimeout);
    }
  }

  private async fetchAgentHealth({ port, host }: IAgent) {
    const url = `http://${host}:${port}/health`;

    return axios.get(url);
  }

  private deleteAgent({ port, host }: IAgent) {
    this.agents = this.agents.filter((el) => el.port !== port && el.host !== host);
  }

  private async getWaitingAgent() {
    const agent = this.agents.find((el) => el.status === AgentStatus.Waiting);
    if (agent) {
      try {
        await this.fetchAgentHealth(agent);

        return agent;
      } catch (error) {
        errorLog(`Build agent at http://${agent.host}:${agent.port} not response`);

        this.deleteAgent(agent);

        return false;
      }
    }
    return false;
  }

  private findWaitingBuilds(data: IBuildModel[]) {
    return data.filter(
      (el) =>
        el.status === BuildStatus.Waiting && !this.buildList.find((item) => item.id === el.id),
    );
  }

  private addBuildToQueue(build: IBuildModel) {
    if (!this.buildList.find((el) => el.id !== build.id)) {
      this.buildList.push(build);
    }
  }

  private async getBuildList() {
    try {
      const {
        // @ts-ignore
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
      }, this.retryTimeout);
    }
  }

  private async getSettings() {
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

  private async agentHealthChecking() {
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      try {
        await this.fetchAgentHealth(agent);
      } catch (error) {
        this.deleteAgent(agent);
        if (agent.status === AgentStatus.Working && agent.build) {
          this.buildList.push(agent.build);
        }
      }
    }
    setTimeout(() => {
      this.agentHealthChecking();
    }, this.retryTimeout);
  }
}
