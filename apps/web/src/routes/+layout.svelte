<script lang="ts">
  import './layout.css';

  import favicon from '$lib/assets/favicon.svg';
  import { CarBatteryIcon } from '@lucide/svelte';

  let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex flex-col w-full min-h-dvh lg:max-w-lg mx-auto">
  <div class="flex justify-between gap-2 p-2.5 pb-1">
    <div></div>
    <div class="flex justify-center items-center flex-1 gap-2">
      <CarBatteryIcon />
      <h1 class="font-semibold">BMS</h1>
    </div>
    <div></div>
  </div>
  {@render children()}
</div>
