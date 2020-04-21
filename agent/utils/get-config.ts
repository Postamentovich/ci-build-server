import { port, serverHost, serverPort } from '../agent-conf.json';

const PORT = port ? port : 8001;
const SERVER_HOST = serverHost ? serverHost : '127.0.0.1';
const SERVER_PORT = serverPort ? serverPort : 8080;

interface IConfig {
  port: number;
  serverHost: string;
  serverPort: number;
}

export default { port: PORT, serverHost: SERVER_HOST, serverPort: SERVER_PORT } as IConfig;
