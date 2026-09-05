<script lang="ts">
  import { browser } from '$app/env';
  import { onDestroy } from 'svelte';

  import Button from '$components/ui/button/button.svelte';
  import MenuStatus from '$components/MenuStatus.svelte';

  import * as Empty from '$components/ui/empty';
  import * as Tabs from '$components/ui/tabs';

  import { BluetoothIcon, CircleDashedIcon } from '@lucide/svelte';
  import { conn, manager, status } from '$lib/store/bms.svelte';

  let wakeLock: WakeLockSentinel | null = null;
  const hasBluetooth = browser && typeof navigator.bluetooth != 'undefined';

  let activeTab = $state('status');

  async function handleConnect() {
    await manager.connect().then(onHashChange);
    navigator.wakeLock.request('screen').then((wl) => {
      wakeLock = wl;
    });
  }

  const onHashChange = () => {
    activeTab = window.location.hash.replace(/^#/, '') || 'status';
  };

  onDestroy(() => {
    if (wakeLock) wakeLock.release().then(() => (wakeLock = null));
  });
</script>

<svelte:window on:hashchange={onHashChange} />

{#snippet ComingSoon()}
  <Empty.Root>
    <Empty.Header>
      <Empty.Media variant="icon">
        <CircleDashedIcon />
      </Empty.Media>
      <Empty.Title>Coming Soon</Empty.Title>
      <Empty.Description>
        This feature currently is not available. Try checking occasionaly, it might eventually implemented.
      </Empty.Description>
    </Empty.Header>
  </Empty.Root>
{/snippet}

{#if !conn.isConnected && !conn.hasConnected}
  <Empty.Root style="min-height: calc(100dvh - 4rem);">
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
  <Tabs.Root class="flex-1" bind:value={activeTab}>
    <Tabs.List
      variant="line"
      class="sticky top-0 w-full border-b z-10 h-10! bg-background/80 backdrop-blur-2xl">
      <Tabs.Trigger value="status"><a href="#status">Status</a></Tabs.Trigger>
      <Tabs.Trigger value="device"><a href="#device">Device</a></Tabs.Trigger>
      <Tabs.Trigger value="logs"><a href="#logs">Logs</a></Tabs.Trigger>
    </Tabs.List>
    <Tabs.Content value="status">
      <MenuStatus data={status} />
    </Tabs.Content>
    <Tabs.Content value="device" class="flex flex-col items-center">
      {@render ComingSoon()}
    </Tabs.Content>
    <Tabs.Content value="logs" class="flex flex-col items-center">
      {@render ComingSoon()}
    </Tabs.Content>
  </Tabs.Root>
{/if}
