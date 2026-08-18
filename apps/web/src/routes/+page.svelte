<script lang="ts">
  import Button from '$components/ui/button/button.svelte';

  import * as bms from '$lib/bms.svelte';

  const cellStats = $derived(bms.status.cellStatus);
  const connected = $derived(bms.conn.isConnected);

  function toggleConn() {
    if (connected) bms.manager.disconnect();
    else bms.manager.connect();
  }
</script>

<Button variant={connected ? 'destructive' : 'default'} onclick={toggleConn}>
  {connected ? 'Disconnect' : 'Connect'}
</Button>

{#if cellStats.cells.length > 0}
  <div class="grid grid-flow-row grid-cols-3 gap-2">
    {#each cellStats.cells as cell, i (i)}
      <div
        class={[
          cellStats.maxVoltageCell === i + 1
            ? 'text-primary'
            : cellStats.minVoltageCell === i + 1
              ? 'text-destructive'
              : 'text-muted-foreground',
        ]}>
        {cell.voltage.toFixed(3)}
      </div>
    {/each}
  </div>
{/if}
