import type { PageLoad } from './$types';
import type { RecordData } from '$lib/recorder/types';

import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
  const res = await fetch(`/records/${params.deviceID}/${params.recordTS}.bin`);

  if (res.ok) {
    const result: RecordData[] | null = await res.json().catch(() => null);
    if (result) return { result };
  }

  return error(404);
};
