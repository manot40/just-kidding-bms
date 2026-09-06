<script lang="ts">
  import type { PageProps } from './$types';

  import { LineChart } from 'layerchart';
  import { curveNatural } from 'd3-shape';

  import * as Card from '$components/ui/card';
  import * as Chart from '$components/ui/chart';

  let { params, data }: PageProps = $props();

  const chartConfig = $derived(
    (data.cellSeries || []).reduce((acc, next, i) => {
      const cellNum = parseInt(next.label.match(/\d/g)?.join('') || `${i}`);
      acc[next.key] = { label: next.label, color: `var(--cell-${cellNum}, var(--color-muted-foreground))` };
      return acc;
    }, {} as Chart.ChartConfig)
  );

  const series = $derived(data.cellSeries?.map((s) => ({ ...s, color: chartConfig[s.key].color })));
  const yBaseline = $derived(data.lowestVoltage.cellVoltage ? data.lowestVoltage.cellVoltage + 0.01 : 3);
</script>

<div class="mt-2.5 px-2.5">
  <Card.Root>
    <Card.Header>
      <Card.Title>Voltage Trend</Card.Title>
      <Card.Description>Cells voltage sag graph relative to it's power draw</Card.Description>
    </Card.Header>
    <Card.Content>
      <Chart.Container config={chartConfig}>
        <LineChart
          data={data.cellVoltageCurrentChart}
          {series}
          x="current"
          axis="x"
          {yBaseline}
          props={{
            spline: { curve: curveNatural, motion: 'tween', strokeWidth: 2 },
            highlight: { points: { r: 4 } },
          }}>
          {#snippet tooltip()}
            <Chart.Tooltip hideLabel />
          {/snippet}
        </LineChart>
      </Chart.Container>
    </Card.Content>
  </Card.Root>
</div>

<style>
  :global(body) {
    --cell-1: #a84c4c;
    --cell-2: #b96a4b;
    --cell-3: #b99c4b;
    --cell-4: #86b94b;
    --cell-5: #5db94b;
    --cell-6: #4bb979;
    --cell-7: #4bb9a1;
    --cell-8: #4bb5b9;
    --cell-9: #4b84b9;
    --cell-10: #4b77b9;
    --cell-11: #4b4db9;
    --cell-12: #714bb9;
    --cell-13: #9f4bb9;
    --cell-14: #3dd137;
    --cell-15: #c5db47;
    --cell-16: #b94baa;
    --cell-17: #b94b98;
    --cell-18: #db5192;
    --cell-19: #51a8db;
    --cell-20: #51dbb2;
    --cell-21: #7642ca;
    --cell-22: #3b97ee;
    --cell-23: #ffffff;
    --cell-24: #8d8589;
  }
</style>
