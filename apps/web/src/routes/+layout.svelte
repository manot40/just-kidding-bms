<script lang="ts">
  import './layout.css';

  import { CarBatteryIcon } from '@lucide/svelte';

  let { children } = $props();
</script>

<svelte:head>
  <title>Smart BMS Monitoring</title>

  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" href="/favicon.png" sizes="48x48" />
  <link rel="icon" href="/icons/icon-192x192.png" type="image/png" sizes="192x192" />
  <link rel="icon" href="/icons/icon-512x512.png" type="image/png" sizes="512x512" />
  <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />

  <meta name="theme-color" content="#0a0a0a" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-status-bar-style" content="default" />
  <meta name="mobile-web-app-title" content="Smart BMS Monitoring" />
</svelte:head>

<div class="flex flex-col w-full min-h-dvh lg:max-w-lg mx-auto">
  <div class="flex justify-between gap-2 p-2.5 pb-1">
    <div></div>
    <div class="flex justify-center items-center flex-1 gap-2">
      <CarBatteryIcon />
      <h1 class="font-semibold">Smart BMS</h1>
    </div>
    <div></div>
  </div>
  {@render children()}
</div>
