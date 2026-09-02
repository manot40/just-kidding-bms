import type { BMSStatus } from '@manot40/jk-bms';
import type { WorkerRequest } from './types';
type PromiseArgs = [resolve: () => void, reject: (reason?: any) => void];

import OPFSWorker from './worker?worker';

export class RecordWriter {
  private ended = false;
  private worker: Worker;

  constructor(private id: string) {
    this.worker = new OPFSWorker();
  }

  private createMessageHandler(...args: PromiseArgs) {
    return (e: MessageEvent) => {
      const message = e.data;
      if (message.success) {
        args[0]();
      } else {
        args[1](new Error(message.error));
      }
    };
  }

  get closed() {
    return this.ended;
  }

  init() {
    if (this.ended) throw new Error('Cannot initialize a closed RecordWriter.');
    return new Promise<void>((...args) => {
      const fn = this.createMessageHandler(...args);
      this.worker.addEventListener('message', fn);
      this.worker.postMessage({ action: 'INIT', id: this.id } as WorkerRequest<BMSStatus>);
    });
  }

  write(data: BMSStatus) {
    if (this.ended) throw new Error('Cannot write to a closed RecordWriter.');

    data = structuredClone(data);
    // @ts-ignore
    delete data.devStatus;

    return new Promise<void>((...args) => {
      const fn = this.createMessageHandler(...args);
      this.worker.addEventListener('message', fn);
      this.worker.postMessage({ action: 'WRITE', id: this.id, data } as WorkerRequest<BMSStatus>);
    });
  }

  close() {
    return new Promise<void>((...args) => {
      const fn = this.createMessageHandler(...args);
      this.worker.addEventListener('message', fn);
      this.worker.postMessage({ action: 'CLOSE', id: this.id } as WorkerRequest<BMSStatus>);
    }).then(() => {
      this.ended = true;
      this.worker.terminate();
    });
  }
}
