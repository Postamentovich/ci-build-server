const express = require('express');
const AgentController = require('./controllers/agent-controller');
const { port } = require('./agent-conf.json');
const { infoLog } = require('./utils/console-log');

const app = express();
const PORT = typeof port === 'number' ? port : 8001;
const controller = new AgentController();

controller.init();

app.use(express.json());

app.post('/build', async (req, res) => {
  const { buildId, repoName, commitHash, buildCommand } = req.body;

  controller.build(buildId, repoName, commitHash, buildCommand);

  res.sendStatus(200);
});

app.get('/health', (req, res) => {
  res.sendStatus(200);
});

app.listen(PORT, () => infoLog(`Build agent listening at http://localhost:${PORT}`));
