import { BuildStatus } from './BuildStatus';

export interface IBuildResult {
  status: BuildStatus;
  log: string;
  buildId: string;
}
