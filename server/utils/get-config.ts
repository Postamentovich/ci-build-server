import { apiBaseUrl, apiToken, port } from '../server-conf.json';

const PORT = port ? port : 8080;
const API_BASE_URL = apiBaseUrl ? apiBaseUrl : 'https://hw.shri.yandex/api/';

interface IConfig {
  port: number;
  apiBaseUrl: string;
  apiToken: string;
}

export default { port: PORT, apiBaseUrl: API_BASE_URL, apiToken } as IConfig;
