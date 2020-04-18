const express = require('express');
const BuildController = require('./controllers/build-controller');
const { port, apiToken } = require('./server-conf.json');
const { errorLog, infoLog } = require('./utils/console-log');

const app = express();
const controller = new BuildController();
const PORT = typeof port === 'number' ? port : 7000;

if (apiToken) {
  app.use(express.json());

  controller.start();

  app.post('/notify-agent', (req, res) => {
    const { port, host } = req.body;

    controller.addAgent(port, host);

    res.sendStatus(200);
  });

  app.post('/notify-build-result', (req, res) => {
    const { buildId, status, log } = req.body;

    controller.addBuildResult(buildId, status, log);

    res.sendStatus(200);
  });

  app.listen(PORT, () => infoLog(`App listening at http://localhost:${PORT}`));
} else {
  errorLog('Please add apiToken in server-conf.json');
}
