<script lang="ts">
  import type { BMSStatus, CellDetail } from '@manot40/jk-bms';

  import { useDebounce } from '$lib/hooks/debounce.svelte';

  import Progress from '$components/ui/progress/progress.svelte';
  import Skeleton from '$components/ui/skeleton/skeleton.svelte';
  import RecordOperation from '$components/RecordOperation.svelte';

  import {
    type LucideIcon,
    BatteryIcon,
    BatteryCharging,
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    CpuIcon,
    ThermometerIcon,
  } from '@lucide/svelte';

  type Props = { data: BMSStatus };
  const numFmt = Intl.NumberFormat('id').format;

  const { data }: Props = $props();

  const devFlags = $derived(data.devFlags);
  const packStats = $derived(data.packStatus);
  const cellStats = $derived(data.cellStatus);
  const balanceState = $derived(!devFlags.isBalancing ? 0 : packStats.balancingCurrent > 0 ? 1 : -1);
  const chargeStateDeb = useDebounce(() => devFlags.isCharging, 6e3);

  const cells = $derived.by<(CellDetail | null)[]>(() => {
    if (cellStats.cells.length > 0) return cellStats.cells;
    return Array(24).fill(null);
  });
  const powerDrawStats = $derived.by(() => {
    const fullCapDrain = -packStats.fullChargeCapacity;
    if (packStats.current <= fullCapDrain * 2) return 'high';
    else if (packStats.current <= fullCapDrain) return 'medium';
    else return '';
  });
  const powerDrawState = $derived(packStats.power < 0 ? 'drain' : packStats.power > 0 ? 'charge' : '');

  const soc = $derived(packStats.stateOfCharge);
  const Battery = $derived.by(() => {
    if (devFlags.isCharging) return { Icon: BatteryCharging, color: 'bg-green-600 animate-pulse' };
    else if (soc > 80) return { Icon: BatteryFull, color: 'bg-green-600' };
    else if (soc > 40) return { Icon: BatteryMedium, color: undefined };
    else if (soc > 20) return { Icon: BatteryLow, color: 'bg-yellow-600' };
    else return { Icon: BatteryIcon, color: 'bg-red-600' };
  });

  function getCellColor(i: number) {
    if (cellStats.cells.length === 0) return;
    else if (cellStats.maxVoltageCell === i + 1) {
      let cn = 'bg-foreground/20 text-foreground';
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

  function getTempColor(temp: number) {
    let textColor: string | undefined;
    if (temp > 45) textColor = 'text-red-600';
    else if (temp > 36) textColor = 'text-yellow-600';
    else if (temp < 30) textColor = 'text-green-600';
    return textColor;
  }
</script>

{#snippet Block(mainValue: [string, string], secondValue: [string, string], cn?: string | string[])}
  <div class={['text-center', ...(Array.isArray(cn) ? cn : [cn])]}>
    <div class="top p-2.5 text-3xl font-semibold border-b border-dashed">
      <span class="value">{mainValue[0]}</span>
      <sup class="unit text-lg -ml-1">{mainValue[1]}</sup>
    </div>
    <div class="bot p-1">
      <span class="value font-medium">{secondValue[0]}</span>
      <span class="unit text-xs -ml-px">{secondValue[1]}</span>
    </div>
  </div>
{/snippet}

{#snippet Temp(temp: number | undefined, Icon: LucideIcon, extra?: string)}
  <div class="flex items-center gap-1.5">
    <div class="text-xs"><Icon class="size-4 inline" />{extra}</div>
    {#if typeof temp == 'number'}
      <div class={['font-semibold', extra && 'ml-px']}>
        <span class={['transition-colors duration-300', getTempColor(temp)]}>{temp.toFixed(1)}</span>
        <span>°C</span>
      </div>
    {:else}
      <em>N/A</em>
    {/if}
  </div>
{/snippet}

<section id="soc" class="p-2 pb-3 select-none">
  <div class="flex justify-between mb-1.5 items-center">
    <div class="flex gap-1.5 items-center text-xs">
      <Battery.Icon class="size-5" />
      <p class="font-medium">{cellStats.type} {chargeStateDeb.value ? '• Charging' : ''}</p>
    </div>
    <div class="flex items-center text-sm font-medium">
      <p>{packStats.capacityRemaining.toFixed(2)} Ah</p>
      <span>&nbsp;•&nbsp;</span>
      <p>{packStats.stateOfCharge < 100 ? packStats.stateOfCharge.toFixed(2) : 100}%</p>
    </div>
  </div>
  <Progress value={soc} color={Battery.color} />
</section>

<section id="temperatures" class="border-t p-2">
  <div class="grid grid-cols-3 place-items-center text-sm">
    {@render Temp(data.temperatures.mosfet, CpuIcon)}
    {@render Temp(data.temperatures.sensor1, ThermometerIcon, '1')}
    {@render Temp(data.temperatures.sensor2, ThermometerIcon, '2')}
  </div>
</section>

<section id="power" class="grid grid-cols-2 select-none border-y">
  {@render Block(
    [packStats.totalVoltage.toFixed(2), 'V'],
    [cellStats.deltaCellVoltage.toFixed(3), 'ΔV'],
    'border-r'
  )}
  {@render Block(
    [packStats.current.toFixed(2), 'A'],
    [numFmt(Math.round(packStats.power < 0 ? packStats.power * -1 : packStats.power)), 'W'],
    ['power-draw transition-colors duration-300', powerDrawStats, powerDrawState]
  )}
</section>

<section id="cells" class="grid grid-cols-4 select-none">
  {#each cells as cell, i (i)}
    <div class={['cell transition-colors duration-300', getCellColor(i)]}>
      <div class="text-xs">#{i + 1}</div>

      <div>
        {#if cell}
          <span>{cell.voltage.toFixed(3)}</span>
          <sup class="-ml-1">v</sup>
        {:else}
          <Skeleton class="h-4 w-16 my-2" />
        {/if}
      </div>

      {#if cell}
        <div class="text-xs">
          <span>{cell.resistance.toFixed(3)}</span>
          Ω
        </div>
      {:else}
        <Skeleton class="h-2 w-8" />
      {/if}
    </div>
  {/each}
</section>

<div class="border-b">
  <RecordOperation class="w-full rounded-none" />
</div>

<style>
  .cell {
    padding: calc(var(--spacing) * 2);
    border-bottom: 1px dashed var(--color-muted);
    &:not(:nth-child(4n)) {
      border-right: 1px dashed var(--color-muted);
    }
    &:nth-last-child(-n + 4) {
      border-bottom-style: solid;
    }
  }

  .power-draw {
    &.high > .top > .value {
      color: var(--color-red-600);
    }
    &.medium > .top > .value {
      color: var(--color-yellow-600);
    }
    &.drain > .bot > .value {
      color: var(--color-red-600);
    }
    &.charge {
      & > .bot > .value,
      & > .top > .value {
        color: var(--color-green-600);
      }
    }
  }
</style>
