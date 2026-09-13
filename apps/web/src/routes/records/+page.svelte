<script lang="ts">
  import { onMount } from 'svelte';
  import { RECORDS_CACHE_KEY } from '$lib/constants';

  import Button from '$components/ui/button/button.svelte';
  import { Trash } from '@lucide/svelte';

  type RecordEntry = {
    id: string;
    device: string;
    recordedAt: Date;
  };

  const PATTERN = /\.json$/;
  const dateFmt = new Intl.DateTimeFormat(undefined, {
    hour12: false,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format;

  let records = $state.raw<RecordEntry[]>([]);

  onMount(async () => {
    const cache = await caches.open(RECORDS_CACHE_KEY);
    const keys = (await cache.keys()).toReversed();
    records = keys.flatMap((req) => {
      const pathName = new URL(req.url).pathname;
      if (!PATTERN.test(pathName)) return [];

      const path = pathName.replace(PATTERN, '');
      const [, device, tsString] = path.split('/').filter(Boolean);
      const recordedAt = new Date(parseInt(tsString) * 1000);
      return { id: path, device, recordedAt };
    });
  });

  async function deleteRecord(e: Event, record: RecordEntry) {
    e.preventDefault();
    e.stopPropagation();

    const result = confirm('Are you sure to delete this record?');
    if (!result) return;

    const cache = await caches.open(RECORDS_CACHE_KEY);
    const [matchKey] = record.id.split('.');

    for (const key of await cache.keys()) {
      if (key.url.includes(matchKey)) await cache.delete(key);
    }
  }
</script>

<div class="flex flex-col">
  {#each records as record (record.id)}
    <div class="border-b">
      <Button is="a" href={record.id} variant="ghost" class="justify-between rounded-none w-full h-14 py-8">
        <div class="flex-col items-start gap-1">
          <div>Record {dateFmt(record.recordedAt)}</div>
          <div class="text-sm text-muted-foreground">
            {record.device}
          </div>
        </div>
        <Button size="icon-lg" variant="destructive" onclick={(e) => deleteRecord(e, record)}>
          <Trash />
        </Button>
      </Button>
    </div>
  {/each}
</div>
