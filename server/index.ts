import express from 'express';
import BuildController from './controllers/build-controller';
import { IBuildResult, INotifyAgentRequest, IResponseStatusOK } from './models';
import { errorLog, infoLog } from './utils/console-log';
import config from './utils/get-config';

const { port: PORT, apiToken } = config;

const app = express();

const controller = new BuildController();

if (apiToken) {
  app.use(express.json());

  controller.start();

  app.post<{}, IResponseStatusOK, INotifyAgentRequest>('/notify-agent', (req, res) => {
    const { port, host } = req.body;

    controller.addAgent(port, host);

    res.send({ status: 'OK' });
  });

  app.post<{}, IResponseStatusOK, IBuildResult>('/notify-build-result', (req, res) => {
    const { buildId, status, log } = req.body;

    controller.addBuildResult(buildId, status, log);

    res.send({ status: 'OK' });
  });

  app.listen(PORT, () => infoLog(`Build server listening at http://localhost:${PORT}`));
} else {
  errorLog('Please add apiToken in server-conf.json');
}
