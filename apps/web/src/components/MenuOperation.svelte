<script lang="ts">
  import Progress from '$components/ui/progress/progress.svelte';

  import { BatteryIcon, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium } from '@lucide/svelte';

  import * as bms from '$lib/bms.svelte';

  const devFlags = $derived(bms.status.devFlags);
  const packStats = $derived(bms.status.packStatus);
  const cellStats = $derived(bms.status.cellStatus);
  const balanceState = $derived(
    !devFlags.isBalancing ? 0 : bms.status.packStatus.balancingCurrent > 0 ? 1 : -1
  );

  const soc = $derived(packStats.stateOfCharge);
  const Battery = $derived.by(() => {
    if (devFlags.isCharging) return { Icon: BatteryCharging, color: 'bg-green-600 animate-pulse' };
    else if (soc > 80) return { Icon: BatteryFull, color: 'bg-green-600' };
    else if (soc > 40) return { Icon: BatteryMedium, color: undefined };
    else if (soc > 20) return { Icon: BatteryLow, color: 'bg-yellow-600' };
    else return { Icon: BatteryIcon, color: 'bg-red-600' };
  });

  function getCellColor(i: number) {
    if (cellStats.maxVoltageCell === i + 1) {
      let cn = 'bg-primary/20 text-primary';
      if (balanceState === -1) cn += ' animate-pulse';
      return cn;
    } else if (cellStats.minVoltageCell === i + 1) {
      let cn = 'bg-destructive/20 text-destructive';
      if (balanceState === 1) cn += ' animate-pulse';
      return cn;
    } else {
      return 'text-muted-foreground';
    }
  }
</script>

{#snippet MainBlock(mainValue: [string, string], secondValue: [string, string], cn?: string)}
  <div class={['text-center', cn]}>
    <div class="p-2.5 text-3xl font-semibold border-b">
      {mainValue[0]}
      <sup class="text-lg -ml-1">{mainValue[1]}</sup>
    </div>
    <div class="p-1">
      {secondValue[0]}
      <span class="text-xs -ml-px">{secondValue[1]}</span>
    </div>
  </div>
{/snippet}

<section id="soc" class="p-2 pb-2.5 select-none">
  <div class="flex justify-between mb-1.5 items-center">
    <div class="flex gap-1 items-center text-xs">
      <Battery.Icon class="size-5" />
      <p>{devFlags.isCharging ? 'Charging Battery' : 'Battery SoC'}</p>
    </div>
    <div class="flex items-center text-sm font-medium">
      <p>{packStats.capacityRemaining.toFixed(2)} Ah</p>
      <span>&nbsp;•&nbsp;</span>
      <p>{packStats.stateOfCharge < 100 ? packStats.stateOfCharge.toFixed(2) : 100}%</p>
    </div>
  </div>
  <Progress value={soc} color={Battery.color} />
</section>

<section id="power" class="grid grid-cols-2 select-none border-y">
  {@render MainBlock(
    [packStats.totalVoltage.toFixed(2), 'V'],
    [cellStats.deltaCellVoltage.toFixed(3), 'ΔV'],
    'border-r'
  )}
  {@render MainBlock([packStats.current.toFixed(2), 'A'], [packStats.power.toFixed(0), 'W'])}
</section>

<section id="cells" class="grid grid-cols-4 select-none">
  {#each cellStats.cells as cell, i (i)}
    <div class={[getCellColor(i), 'p-2  border-b']}>
      <div class="text-xs">#{i + 1}</div>

      <div>
        <span>{cell.voltage.toFixed(3)}</span>
        <sup class="-ml-1">v</sup>
      </div>
      <div class="text-xs">
        <span>{cell.resistance.toFixed(3)}</span>
        Ω
      </div>
    </div>
  {/each}
</section>

<style>
  #cells > .border-b:not(:nth-child(4n)) {
    @apply border-r;
  }
</style>
