<script lang="ts">
  import { onDestroy } from 'svelte';

  import { cn } from '$lib/utils';
  import * as bms from '$lib/store/bms.svelte';
  import { RecordWriter } from '$lib/store/record.writer';

  import Button from '$components/ui/button/button.svelte';

  const { class: cn_, ...p } = $props();

  let unsub: (() => void) | undefined;
  let recorder = $state.raw<RecordWriter | null>(null);
  const recording = $derived(recorder !== null);

  function startRecording() {
    if (!bms.conn.isConnected) return;

    recorder = new RecordWriter(bms.status.devStatus.serialNumber);
    return recorder.init().then(() => {
      unsub = bms.manager.addListener(({ bms }) => recorder?.write(bms));
    });
  }

  function stopRecording() {
    if (!recorder) return;
    unsub = unsub?.() as undefined;
    recorder.close().then(() => {
      recorder = null;
    });
  }

  onDestroy(stopRecording);
</script>

<Button
  size="lg"
  variant="ghost"
  {...p}
  class={cn('py-6', recording && 'text-destructive! bg-destructive/20!', cn_)}
  onclick={recording ? stopRecording : startRecording}>
  {recording ? 'Stop' : 'Start'} Recording
</Button>
