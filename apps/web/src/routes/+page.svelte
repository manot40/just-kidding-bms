<script lang="ts">
  import { browser } from '$app/env';
  import { onDestroy } from 'svelte';

  import Button from '$components/ui/button/button.svelte';
  import * as Empty from '$components/ui/empty/index.js';
  import MenuOperation from '$components/MenuOperation.svelte';

  import { BluetoothIcon } from '@lucide/svelte';
  import { conn, manager, status } from '$lib/bms.svelte';

  const hasBluetooth = browser && typeof navigator.bluetooth != 'undefined';

  let wakeLock: WakeLockSentinel | null = null;

  function handleConnect() {
    manager.connect();
    navigator.wakeLock.request('screen').then((wl) => {
      wakeLock = wl;
    });
  }

  onDestroy(() => {
    if (wakeLock) wakeLock.release().then(() => (wakeLock = null));
  });
</script>

{#if !conn.isConnected && !conn.hasConnected}
  <Empty.Root class="min-h-dvh">
    <Empty.Header>
      <Empty.Media variant="icon">
        <BluetoothIcon />
      </Empty.Media>
      <Empty.Title>Connect BMS</Empty.Title>
      <Empty.Description>
        You haven't connected to any device yet. Make sure your browser has <a
          target="_blank"
          href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API"
          rel="noopener noreferrer">
          Bluetooth
        </a>
        supoprted and enabled.
      </Empty.Description>
    </Empty.Header>
    <Empty.Content>
      <Button class="px-6" disabled={!hasBluetooth} onclick={handleConnect}>Connect</Button>
    </Empty.Content>
  </Empty.Root>
{:else}
  <MenuOperation data={status} />
{/if}
