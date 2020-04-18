const axios = require('axios').default;
const { apiBaseUrl, apiToken } = require('../server-conf.json');
const https = require('https');

const BASE_URL = typeof apiBaseUrl === 'string' ? apiBaseUrl : 'https://hw.shri.yandex/api/';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Bearer ${apiToken}` },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

const storageAPI = {
  getBuildList: (offset = 0, limit = 25) => {
    const params = new URLSearchParams();
    params.set('offset', offset);
    params.set('limit', limit);
    return api.get('build/list', { params });
  },

  setBuildStart: (model) => api.post('build/start', model),

  setBuildFinish: (model) => api.post('build/finish', model),

  setBuildCancel: (model) => api.post('build/cancel', model),

  getConfig: () => api.get('conf'),
};

module.exports = { storageAPI, api };
