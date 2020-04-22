export interface IConfigurationModel {
  id?: string;
  repoName: string;
  buildCommand: string;
  mainBranch: string;
  period: number;
}
