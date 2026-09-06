/// <reference lib="webworker" />

import type { RecordData, WorkerRequest, WorkerResponse } from './writer.types';
type DataStream = WritableStreamDefaultWriter<RecordData>;

import RecordTransformer from './transformer';
import { RECORDS_CACHE_KEY } from '$lib/constants';

declare const self: DedicatedWorkerGlobalScope;

const cache = caches.open(RECORDS_CACHE_KEY);

// prettier-ignore
let stream: DataStream | null = null,
    streamPromise: Promise<void> | null = null;

async function initCacheStream(id: string): Promise<void> {
  const timestamp = Math.round(Date.now() / 1000);
  const cacheKey = `/records/${id}/${timestamp}`;
  const pipeline = new TransformStream<RecordData, RecordData>();

  stream = pipeline.writable.getWriter() as DataStream;

  const compressionStream = pipeline.readable
    .pipeThrough(new RecordTransformer(cache, cacheKey))
    .pipeThrough(new CompressionStream('gzip'));
  const response = new Response(compressionStream, {
    headers: { 'Content-Type': 'application/octet-stream' },
  });

  streamPromise = (async () => {
    await (await cache).put(`${cacheKey}.replay`, response);
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

        await stream.write({ ts: Date.now(), ss: msg.data });
        return self.postMessage({ success: true, action: 'WRITE' } as WorkerResponse);

      case 'CLOSE':
        if (!stream) throw ERROR_UNINITIALIZED;

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
