<script lang="ts">
  import { onMount } from 'svelte';
  import { RECORDS_CACHE_KEY } from '$lib/constants';

  import Button from '$components/ui/button/button.svelte';

  type RecordEntry = {
    id: string;
    device: string;
    recordedAt: Date;
  };

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    hour12: false,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format;

  let records = $state.raw<RecordEntry[]>([]);

  onMount(async () => {
    const cache = await caches.open(RECORDS_CACHE_KEY);
    const keys = (await cache.keys()).toReversed();
    records = keys.map((req) => {
      const path = new URL(req.url).pathname.replace(/\.json$/, '');
      const [, device, tsString] = path.split('/').filter(Boolean);
      const recordedAt = new Date(parseInt(tsString) * 1000);
      return { id: path, device, recordedAt };
    });
  });
</script>

<div class="flex flex-col">
  {#each records as record (record.id)}
    <div class="border-b">
      <Button
        is="a"
        href={record.id}
        variant="ghost"
        class="flex-col items-start gap-1 rounded-none w-full h-14 py-8">
        <div>Record {dateFmt(record.recordedAt)}</div>
        <div class="text-sm text-muted-foreground">
          {record.device}
        </div>
      </Button>
    </div>
  {/each}
</div>
