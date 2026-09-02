import type { PageLoad } from './$types';
import type { RecordData } from '$lib/recorder/types';

import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
  const res = await fetch(`/records/${params.deviceID}/${params.recordTS}.json`);

  if (res.ok) {
    const result = await res.json().catch(() => null);
    if (result) return result as RecordData[];
  }

  return error(404);
};
