<script lang="ts">
  import type { PageProps } from './$types';

  import { LineChart } from 'layerchart';
  import { curveNatural } from 'd3-shape';

  import * as Card from '$components/ui/card';
  import * as Chart from '$components/ui/chart';
  import * as Select from '$components/ui/select';
  import Switch from '$components/ui/switch/switch.svelte';
  import { Label } from '$components/ui/label';

  import { ChevronsDownIcon, DiffIcon, FilesIcon, TimerIcon, XLineTopIcon } from '@lucide/svelte';
  import Entry from '$components/Entry.svelte';

  let { params, data }: PageProps = $props();

  let focusValues = $state<string[]>([]);
  let useUnifiedBase = $state(true);

  const cellSeries = $derived(
    data.cellSeries?.filter((v) => !focusValues.length || focusValues.includes(v.key)) || []
  );
  const chartConfig = $derived(
    cellSeries.reduce((acc, next, i) => {
      const cellNum = parseInt(next.label.match(/\d/g)?.join('') || `${i}`);
      acc[next.key] = { label: next.label, color: `var(--cell-${cellNum}, var(--color-muted-foreground))` };
      return acc;
    }, {} as Chart.ChartConfig)
  );

  const series = $derived(cellSeries.map((s) => ({ ...s, color: chartConfig[s.key].color })));
  const yBaseline = $derived(useUnifiedBase ? 3 : data.lowestVoltage.cellVoltage || 3);
  const lowestVolt = $derived(data.lowestCellVoltage);
  const voltDeviation = $derived(data.highestVoltageDeviation);
  const highestCellVoltage = $derived(data.averageCellsVoltage + 0.025);
</script>

<div class="mt-3 px-2.5">
  <div class="grid grid-cols-2 gap-1">
    <Entry icon={DiffIcon} label="Largest Deviation" class="p-2">
      {voltDeviation?.deltaCellVoltage.toFixed(3) || 'N/A '}V
      <span>on {Math.round(voltDeviation?.current || 0) * -1}A</span>
    </Entry>
    <Entry icon={ChevronsDownIcon} label="Lowest Voltage" class="p-2">
      <span>{lowestVolt?.voltage.toFixed(3)}V (Cell {lowestVolt?.cellNumber})</span>
    </Entry>
    <Entry icon={XLineTopIcon} label="Average Voltage" class="p-2">
      {data.averageCellsVoltage.toFixed(3) || 'N/A '}V
    </Entry>
    <Entry icon={XLineTopIcon} label="Average Current" class="p-2">
      {data.averageCurrent?.toFixed(3) || 'N/'}A
    </Entry>
    <Entry icon={TimerIcon} label="Duration" class="p-2">
      <span>{Math.round(data.duration / 60 / 1e3)} min</span>
    </Entry>
    <Entry icon={FilesIcon} label="Sample Count" class="p-2">
      <span>{data.sampleCount} samples</span>
    </Entry>
  </div>

  <div class="border border-dashed my-4"></div>

  <div class="flex flex-col gap-1 mb-4">
    <Card.Title>Voltage Trend</Card.Title>
    <Card.Description>Cells voltage sag graph relative to it's power draw</Card.Description>
  </div>

  <div class="flex items-center space-x-2 mb-4">
    <Switch id="std-baseline" bind:checked={useUnifiedBase} />
    <Label for="std-baseline">{useUnifiedBase ? 'Standard' : 'Dynamic'} Baseline</Label>
  </div>

  <Chart.Container config={chartConfig}>
    <LineChart
      {series}
      {yBaseline}
      data={data.cellVoltageCurrentChart}
      x="current"
      y={() => highestCellVoltage}
      points={focusValues.length ? { r: 4 } : undefined}
      // labels={focusValues.length ? { offset: 12 } : undefined}
      props={{
        spline: { curve: curveNatural, motion: 'tween', strokeWidth: 2 },
        highlight: { points: { r: 4 } },
      }}>
      {#snippet tooltip()}
        <Chart.Tooltip hideLabel toFixed={3} />
      {/snippet}
    </LineChart>
  </Chart.Container>

  <div class="flex flex-col gap-2.5 mt-6">
    <Label>Filter by Cell(s)</Label>
    <Select.Root type="multiple" bind:value={focusValues}>
      <Select.Trigger class="w-full">
        <Select.Value placeholder="All cells shown" />
      </Select.Trigger>
      <Select.Content class="max-h-64 bg-background/50 backdrop-blur-xl">
        {#each data.cellSeries as cell (cell.key)}
          <Select.Item value={cell.key}>{cell.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>
</div>

<style>
  :global(body) {
    --cell-1: #1f77b4; /* Steel Blue */
    --cell-2: #d62728; /* Vivid Crimson */
    --cell-3: #2ca02c; /* Forest Green */
    --cell-4: #ff7f0e; /* Deep Amber */
    --cell-5: #9467bd; /* Amethyst Purple */
    --cell-6: #8c564b; /* Chestnut Brown */
    --cell-7: #e377c2; /* Magenta Rose */
    --cell-8: #17becf; /* Deep Cyan */
    --cell-9: #bcbd22; /* Olive Gold */
    --cell-10: #004c6d; /* Midnight Navy */
    --cell-11: #931e18; /* Brick Red */
    --cell-12: #256f5c; /* Deep Teal */
    --cell-13: #d95f02; /* Burnt Orange */
    --cell-14: #5254a3; /* Indigo */
    --cell-15: #8c6d31; /* Ochre */
    --cell-16: #637939; /* Moss Green */
    --cell-17: #843c39; /* Dark Terracotta */
    --cell-18: #7b4173; /* Plum */
    --cell-19: #3957ff; /* Cobalt */
    --cell-20: #109618; /* Leaf Green */
    --cell-21: #e6550d; /* Bright Rust */
    --cell-22: #6b6ecf; /* Periwinkle */
    --cell-23: #bd9e39; /* Warm Brass */
    --cell-24: #545b62; /* Slate Gray (Replaced pure white) */
  }
</style>
