<script lang="ts">
  import { getNthLine } from '$lib/utils';
  import type { PageProps } from './$types';

  let { params, data }: PageProps = $props();

  const recordCount = $derived((data.result.match(/\n/g) || []).length + 1);
</script>

<div>{recordCount}</div>
<div class="overflow-auto">
  <code>{getNthLine(data.result, recordCount)}</code>
  <div class="my-4"></div>
  <code>{data.result}</code>
</div>
