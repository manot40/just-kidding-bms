import type { PageLoad } from './$types';

import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
  const res = await fetch(`/records/${params.deviceID}/${params.recordTS}.replay`);

  if (res.ok) {
    const result: string | null = await res.text().catch(() => null);
    if (result) return { result };
  }

  return error(404);
};
