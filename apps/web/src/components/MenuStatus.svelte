<script lang="ts">
  import type { BMSStatus, CellDetail } from '@manot40/jk-bms';

  import { pluralify } from '$lib/utils';
  // import { useDebounce } from '$lib/hooks/debounce.svelte';

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
    EqualApproximatelyIcon,
    ZapIcon,
  } from '@lucide/svelte';

  type Props = { data: BMSStatus };
  type ClassName = string | Array<string | undefined>;
  const numFmt = Intl.NumberFormat('id').format;

  const { data }: Props = $props();

  const devFlags = $derived(data.devFlags);
  const packStats = $derived(data.packStatus);
  const cellStats = $derived(data.cellStatus);
  const balanceState = $derived(!devFlags.isBalancing ? 0 : packStats.balancingCurrent > 0 ? 1 : -1);

  const power = $derived(Math.round(packStats.power < 0 ? packStats.power * -1 : packStats.power));
  const charging = $derived(packStats.current > 0.5);
  // const chargingDeb = useDebounce(() => charging, 6e3);

  const cells = $derived.by<(CellDetail | null)[]>(() => {
    if (cellStats.cells.length > 0) return cellStats.cells;
    return Array(24).fill(null);
  });
  const powerDrawStats = $derived.by(() => {
    const fullCapDrain = -packStats.fullChargeCapacity;
    if (packStats.current <= fullCapDrain * 2) return 'high-draw';
    else if (packStats.current <= fullCapDrain) return 'medium-draw';
    else return undefined;
  });
  const powerDrawState = $derived(packStats.power < 0 ? 'drain' : packStats.power > 0 ? 'charge' : undefined);

  const soc = $derived(packStats.stateOfCharge);
  const Battery = $derived.by(() => {
    if (charging) return { Icon: BatteryCharging, color: 'bg-green-600 animate-pulse' };
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
    if (temp >= 45) textColor = 'text-red-600';
    else if (temp >= 36) textColor = 'text-yellow-600';
    else if (temp <= 30) textColor = 'text-green-600';
    return textColor;
  }
</script>

{#snippet LargeGrid(value: [string, string], cn?: ClassName)}
  <div
    class={['large-grid text-center p-2 transition-colors duration-300', ...(Array.isArray(cn) ? cn : [cn])]}>
    <div class="text-3xl font-semibold">
      <span class="value">{value[0]}</span>
    </div>
    <div class="text-xs mt-0.5">{value[1]}</div>
  </div>
{/snippet}

{#snippet SmallGrid(
  value: number | string | undefined,
  Icon: LucideIcon | string,
  extra?: { isTemp?: boolean | string; class?: ClassName; mark?: string }
)}
  <div class="flex items-center gap-1.5">
    <div class="text-xs">
      {#if typeof Icon == 'string'}
        <span class="text-sm">{Icon}</span>
      {:else}
        <Icon class="size-4 inline" />{typeof extra?.isTemp == 'string' ? extra.isTemp : ''}
      {/if}
    </div>
    {#if typeof value != 'undefined'}
      <div class={['font-semibold', typeof extra?.isTemp == 'string' && 'ml-px', extra?.class]}>
        {#if extra?.isTemp && typeof value == 'number'}
          <span class={['transition-colors duration-300', getTempColor(value)]}>{value.toFixed(1)}</span>
          <span>°C</span>
        {:else}
          <span class="value">{value}</span>
          {#if extra?.mark}<span class="text-xs -ml-px">{extra.mark}</span>{/if}
        {/if}
      </div>
    {:else}
      <em>N/A</em>
    {/if}
  </div>
{/snippet}

<section id="soc" class="px-2 pb-3 select-none text-sm">
  <div class="flex justify-between mb-2 items-center">
    <div class="flex gap-1.5 items-center">
      <Battery.Icon class="size-5" />
      <p class="font-medium">
        {cellStats.type}
        {packStats.fullChargeCapacity}Ah • {charging
          ? 'Charging'
          : pluralify('Cycle', packStats.chargingCycles)}
      </p>
    </div>
    <div class="flex items-center font-medium">
      <p>{packStats.capacityRemaining.toFixed(2)}Ah</p>
      <span>&nbsp;•&nbsp;</span>
      <p>{packStats.stateOfCharge}%</p>
    </div>
  </div>
  <Progress value={soc} color={Battery.color} />
</section>

<section id="temperatures" class="border-y p-2">
  <div class="grid grid-cols-3 place-items-center text-sm">
    {@render SmallGrid(data.temperatures.mosfet, CpuIcon, { isTemp: true })}
    {@render SmallGrid(data.temperatures.sensor1, ThermometerIcon, { isTemp: '1' })}
    {@render SmallGrid(data.temperatures.sensor2, ThermometerIcon, { isTemp: '2' })}
  </div>
</section>

<section id="power" class="select-none border-b">
  <div class="grid grid-cols-2">
    {@render LargeGrid([packStats.totalVoltage.toFixed(2), 'ΣV'], 'border-r')}
    {@render LargeGrid([packStats.current.toFixed(2), '⎓ A'], [powerDrawStats, powerDrawState])}
  </div>
  <div class="grid grid-cols-3 place-items-center border-t border-dashed p-2">
    {@render SmallGrid(cellStats.averageCellVoltage.toFixed(3), 'x̄V', { mark: 'V' })}
    {@render SmallGrid(cellStats.deltaCellVoltage.toFixed(3), 'ΔV', { mark: 'V' })}
    {@render SmallGrid(numFmt(power), ZapIcon, { mark: 'W', class: [powerDrawStats, powerDrawState] })}
  </div>
</section>

<section id="cells" class="grid grid-cols-4 select-none">
  {#each cells as cell, i (i)}
    {@const balanceProps = getCellColor(i)}
    <div class={['cell transition-colors duration-300', balanceProps]}>
      <div class="text-xs">
        <span>#{i + 1}</span>
        {#if balanceProps?.includes('animate-pulse')}
          <span class="max-[375px]:hidden">
            <EqualApproximatelyIcon class="inline size-3.5 mb-px" /> 1.0
            <sub>A</sub>
          </span>
        {/if}
      </div>

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

<!-- <div class="border-b">
  <RecordOperation class="w-full rounded-none" />
</div> -->

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

  .high-draw .value {
    color: var(--color-red-600);
  }
  .medium-draw .value {
    color: var(--color-yellow-600);
  }

  .drain:not(.large-grid) .value {
    color: var(--color-red-600);
  }
  .charge .value {
    color: var(--color-green-600);
  }
</style>
