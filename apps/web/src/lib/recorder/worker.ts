/// <reference lib="webworker" />

import type { RecordData, WorkerRequest, WorkerResponse } from './types';
type DataStream = WritableStreamDefaultWriter<string> & { written: boolean };

declare const self: DedicatedWorkerGlobalScope;

const ts = (Date.now() / 1000).toFixed(0);
const cachePromise = caches.open('bms-records-cache');

let stream: DataStream | null = null;
let streamPromise: Promise<void> | null = null;

async function initCacheStream(id: string): Promise<void> {
  const dataBridge = new TransformStream<string, string>();
  stream = dataBridge.writable.getWriter() as DataStream;
  stream.written = false;

  const compressionStream = dataBridge.readable
    .pipeThrough(new TextEncoderStream())
    .pipeThrough(new CompressionStream('gzip'));
  const response = new Response(compressionStream, {
    headers: { 'Content-Type': 'application/octet-stream' },
  });

  streamPromise = (async () => {
    const cache = await cachePromise;
    await cache.put(`/records/${id}/${ts}.bin`, response);
  })();
}

self.onmessage = async function (e: MessageEvent<WorkerRequest>): Promise<void> {
  const msg = e.data;
  const ERROR_UNINITIALIZED = new Error('Stream is not initialized yet!');

  try {
    switch (msg.action) {
      case 'INIT':
        if (stream) return;
        await initCacheStream(msg.id);
        return self.postMessage({ success: true, action: 'INIT' } as WorkerResponse);

      case 'WRITE':
        if (!stream) throw ERROR_UNINITIALIZED;
        const prefix = stream.written ? ',' : '[';
        const dataStr = JSON.stringify({ ts: Date.now(), ss: msg.data } satisfies RecordData);

        await stream.write(prefix + dataStr);
        stream.written = true;

        return self.postMessage({ success: true, action: 'WRITE' } as WorkerResponse);

      case 'CLOSE':
        if (!stream) throw ERROR_UNINITIALIZED;

        await stream.write(']');
        await stream.close();
        if (streamPromise) await streamPromise;

        stream = null;
        streamPromise = null;
        return self.postMessage({ success: true, action: 'CLOSE' } as WorkerResponse);

      default:
        throw new Error(`Unknown action: ${(msg as WorkerResponse).action}`);
    }
  } catch (err) {
    const errorResponse: WorkerResponse = {
      success: false,
      action: msg.action,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(errorResponse);
  }
};
