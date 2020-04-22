import axios from 'axios';
import https from 'https';
import config from '../utils/get-config';
import {
  IBuildModel,
  IBuildModelArrayHomeworkApiResponse,
  IFinishBuildInput,
  IStartBuildInput,
} from './../models';

const { apiBaseUrl, apiToken } = config;

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { Authorization: `Bearer ${apiToken}` },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

export const storageAPI = {
  getBuildList: (offset = '0', limit = '25') => {
    const params = new URLSearchParams();
    params.set('offset', offset);
    params.set('limit', limit);
    return api.get<any, IBuildModelArrayHomeworkApiResponse>('build/list', { params });
  },

  setBuildStart: (model: IStartBuildInput) => api.post('build/start', model),

  setBuildFinish: (model: IFinishBuildInput) => api.post('build/finish', model),

  setBuildCancel: (model: IBuildModel) => api.post('build/cancel', model),

  getConfig: () => api.get('conf'),
};
