import axios from 'axios';
import child_process from 'child_process';
import os from 'os';
import util from 'util';
import { BuildStatus, IBuild, IBuildResult } from '../models';
import { errorLog, infoLog } from '../utils/console-log';
import config from '../utils/get-config';

const exec = util.promisify(child_process.exec);

class AgentController {
  private agentPort = config.port;
  private agentHost = os.hostname();
  private serverHost = config.serverHost;
  private serverPort = config.serverPort;
  private storageFolderName = 'storage-agent-repo';
  private retryTimeout = 10000;

  public init() {
    infoLog('Build agent controller inited');

    this.notifyServer();
  }

  public async build(build: IBuild) {
    infoLog('Start new build');

    const { repoName, commitHash, buildCommand, buildId } = build;

    await this.cloneRepo(repoName);

    await this.checkout(commitHash);

    const result = await this.runBuild(buildCommand);

    await this.notifyServerBuildResult({ ...result, buildId });
  }

  public getStatus() {
    // TODO - доделать корректное отбражение статуса контроллера
    return true;
  }

  private async run(command: string) {
    return exec(command);
  }

  private async removeLocalRepo() {
    infoLog('Removing local repo...');

    const command = `rm -rf ${this.storageFolderName}`;

    try {
      await this.run(command);
    } catch (error) {
      errorLog('Failed to remove local repository folder');
      errorLog(`${error}`);
    }
  }

  private async cloneRepo(repoName: string) {
    await this.removeLocalRepo();

    infoLog(`Clone repository ${repoName}`);

    const command = `git clone https://github.com/${repoName} ${this.storageFolderName}`;

    try {
      await this.run(command);

      infoLog(`Repository ${repoName} successfull cloned`);
    } catch (error) {
      errorLog(`Failed to clone repository ${repoName}`);
      errorLog(`${error}`);
    }
  }

  private getServerUrl() {
    return `http://${this.serverHost}:${this.serverPort}`;
  }

  private async notifyServer() {
    const serverUrl = this.getServerUrl();

    const model = { port: this.agentPort, host: this.agentHost };

    infoLog(`Trying notify server`);

    try {
      await axios.post(`${serverUrl}/notify-agent`, model);

      infoLog(`Agent is waiting new task...`);
    } catch (error) {
      errorLog(`Server not response. Another try in  ${this.retryTimeout / 1000}  seconds`);

      setTimeout(() => {
        this.notifyServer();
      }, this.retryTimeout);
    }
  }

  private async notifyServerBuildResult(result: IBuildResult) {
    const serverUrl = this.getServerUrl();

    try {
      await axios.post(`${serverUrl}/notify-build-result`, result);

      infoLog(`Log sent successfully to the server`);

      await this.notifyServer();
    } catch (error) {
      errorLog(`Server not response. Another try in ${this.retryTimeout / 1000}  seconds`);

      const resultTimeout = result;

      setTimeout(() => {
        this.notifyServerBuildResult(resultTimeout);
      }, this.retryTimeout);
    }
  }

  private async runBuild(buildCommand: string): Promise<Omit<IBuildResult, 'buildId'>> {
    infoLog(`Start ${buildCommand}`);
    try {
      const { stdout } = await this.run(`cd ${this.storageFolderName} && ${buildCommand}`);

      const log = stdout;

      infoLog('Build finish successfull');

      return { log, status: BuildStatus.Success };
    } catch (error) {
      const { stdout, stderr } = error;

      const log = stdout + stderr;

      errorLog(`Build finish with errors`);

      return { log, status: BuildStatus.Fail };
    }
  }

  private async checkout(commitHash: string) {
    infoLog(`Checkout to ${commitHash}`);

    const command = `cd ${this.storageFolderName} && git checkout ${commitHash}`;

    try {
      await this.run(command);
    } catch (error) {
      errorLog(`Failed to checkout to ${commitHash}`);
      errorLog(`${error}`);
    }
  }
}
export default AgentController;
