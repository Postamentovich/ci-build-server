export interface IFinishBuildInput {
  buildId: string;
  duration: number;
  success: boolean;
  buildLog: string;
}
