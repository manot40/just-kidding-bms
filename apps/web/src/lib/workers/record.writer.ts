/// <reference lib="webworker" />

import type { WorkerRequest, WorkerResponse } from '$lib/types/opfs.worker';
type DataWriter = WritableStreamDefaultWriter<string> & { written: boolean };

declare const self: DedicatedWorkerGlobalScope;

const ts = (Date.now() / 1000).toFixed(0);
const root = navigator.storage.getDirectory();

let offset = 0;
let writer: DataWriter | null = null;
let writePromise: Promise<void> | null = null;

async function initCompression(id: string): Promise<void> {
  const fsHandler = await root;
  const dataBridge = new TransformStream();
  writer = dataBridge.writable.getWriter() as DataWriter;

  const dirHandle = await fsHandler.getDirectoryHandle(id, { create: true });
  const fileHandle = await dirHandle.getFileHandle(`${ts}.json.gz`, { create: true });
  const accessHandle = await fileHandle.createSyncAccessHandle();

  offset = accessHandle.getSize();
  writer.written = offset > 0;

  const compressStream = dataBridge.readable
    .pipeThrough(new TextEncoderStream())
    .pipeThrough(new CompressionStream('gzip'));

  writePromise = (async () => {
    try {
      for await (const chunk of compressStream) {
        const offBytes = accessHandle.write(chunk, { at: offset });
        offset += offBytes;
        accessHandle.flush();
      }
    } finally {
      accessHandle.close();
    }
  })();
}

self.onmessage = async (e: MessageEvent<WorkerRequest<{}>>): Promise<void> => {
  const message = e.data;
  const ERROR_UNINITIALIZED = new Error(`No writer found for id: ${message.id}`);

  try {
    switch (message.action) {
      case 'INIT':
        if (writer) return;
        await initCompression(message.id);
        return self.postMessage({ status: 'OK', action: 'INIT' } as WorkerResponse);

      case 'WRITE':
        if (!writer) throw ERROR_UNINITIALIZED;
        const prefix = writer.written ? ',' : '[';
        writer.written = true;

        await writer.write(prefix + JSON.stringify(message.data));
        return self.postMessage({ status: 'OK', action: 'WRITE' } as WorkerResponse);

      case 'CLOSE':
        if (!writer) throw ERROR_UNINITIALIZED;

        await writer.write(']');
        await writer.close();
        if (writePromise) await writePromise;

        writer = null;
        writePromise = null;
        return self.postMessage({ status: 'OK', action: 'CLOSE' } as WorkerResponse);

      default:
        throw new Error(`Unknown action: ${(message as { action: string }).action}`);
    }
  } catch (err) {
    const errorResponse: WorkerResponse = {
      status: 'ERROR',
      action: message.action,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(errorResponse);
  }
};
