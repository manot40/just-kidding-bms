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

export type WorkerRequest<T extends {} = {}> =
  | InitRequestMessage
  | WriteRequestMessage<T>
  | CloseRequestMessage;

export interface WorkerSuccessResponse {
  status: 'OK';
  action: 'WRITE' | 'CLOSE' | 'INIT';
}

export interface WorkerErrorResponse {
  status: 'ERROR';
  action: 'WRITE' | 'CLOSE' | 'INIT';
  error: string;
}

export type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;
