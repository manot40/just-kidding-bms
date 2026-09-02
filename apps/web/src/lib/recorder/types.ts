import type { BMSStatus } from '@manot40/jk-bms';

export interface InitRequestMessage {
  id: string;
  action: 'INIT';
}

export interface WriteRequestMessage<T = unknown> {
  id: string;
  action: 'WRITE';
  data: T;
}

export interface CloseRequestMessage {
  id: string;
  action: 'CLOSE';
}

export type WorkerRequest<T extends BMSStatus = BMSStatus> =
  | InitRequestMessage
  | WriteRequestMessage<T>
  | CloseRequestMessage;

export interface WorkerSuccessResponse {
  action: 'WRITE' | 'CLOSE' | 'INIT';
  success: true;
}

export interface WorkerErrorResponse {
  error: string;
  action: 'WRITE' | 'CLOSE' | 'INIT';
  success: false;
}

export type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;

export type RecordData = {
  ts: number;
  ss: BMSStatus;
};
