import type { PageLoad } from './$types';
import type { RecordStatistics } from '$lib/recorder/transformer.types';

import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
  const res = await fetch(`/records/${params.deviceID}/${params.recordTS}.json`);

  if (res.ok) {
    const result: RecordStatistics | null = await res.json().catch(() => null);
    if (result) return result;
  }

  return error(404);
};
