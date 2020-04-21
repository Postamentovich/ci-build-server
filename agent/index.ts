import express from 'express';
import AgentController from './controllers/agent-controller';
import { IBuild, IResponseStatusOK } from './models';
import { infoLog } from './utils/console-log';
import congig from './utils/get-config';

const { port } = congig;

const app = express();

const controller = new AgentController();

controller.init();

app.use(express.json());

app.post<{}, IResponseStatusOK, IBuild>('/build', async (req, res) => {
  controller.build(req.body);

  res.send({ status: 'OK' });
});

app.get<{}, IResponseStatusOK>('/health', (req, res) => {
  const isControllerWorking = controller.getStatus();

  if (isControllerWorking) {
    return res.send({ status: 'OK' });
  }

  return res.sendStatus(500);
});

app.listen(port, () => infoLog(`Build Agent listening at http://localhost:${port}`));
