import type * as Type from './transformer.types';
import type { RecordData } from './writer.types';

const te = new TextEncoder();

export default class RecordTransformer extends TransformStream<RecordData, Uint8Array<ArrayBuffer>> {
  private written_ = false;
  private sampleCount = 0;
  private startedAt = 0;
  private endedAt = 0;

  private lowestCellVoltage: Type.LowestVoltageRecord | undefined;
  private lowestPackVoltage: Type.LowestVoltageRecord | undefined;
  private highestVoltageDeviation: Type.HighestDeviationRecord | undefined;
  private totalCellVoltageSum = 0;
  private totalCellVoltageCount = 0;

  private readonly cellSums: number[] = [];
  private readonly cellCounts: number[] = [];
  // Grouped discharge current buckets: bucket (5, 10, 15...) -> { sum: number[], count: number[] } per cell index
  private readonly currentBuckets = new Map<number, { sum: number[]; count: number[] }>();

  constructor(cache: Promise<Cache> | Cache, key: string) {
    super({
      transform: (data, ctrl) => {
        const prefix = this.written_ ? '\n' : '';
        this.written_ = true;

        this.sampleCount++;
        if (!this.startedAt) this.startedAt = data.ts;
        this.endedAt = data.ts;

        const packStatus = data.ss?.packStatus;
        const cellStatus = data.ss?.cellStatus;
        const devFlags = data.ss?.devFlags;
        const cells = cellStatus?.cells ?? [];

        const rawCurrent = packStatus?.current ?? 0;
        const totalVoltage = packStatus?.totalVoltage ?? 0;
        const isCharging = Boolean(devFlags?.isCharging || packStatus?.current > 0);

        let dischargeCurrent = 0;
        if (rawCurrent < 0) {
          dischargeCurrent = Math.abs(rawCurrent);
        } else if (rawCurrent > 0 && !isCharging) {
          // Fallback for positive convention in mocks/tests
          dischargeCurrent = rawCurrent;
        }

        // Group into 5 divisible value (5, 10, 15, ...so on)
        const currentBucket = Math.round(dischargeCurrent / 5) * 5;
        if (currentBucket >= 5 && cells.length > 0) {
          let bucketData = this.currentBuckets.get(currentBucket);
          if (!bucketData) {
            bucketData = { sum: [], count: [] };
            this.currentBuckets.set(currentBucket, bucketData);
          }
          for (let i = 0; i < cells.length; i++) {
            const v = cells[i]?.voltage ?? 0;
            if (v > 0) {
              bucketData.sum[i] = (bucketData.sum[i] ?? 0) + v;
              bucketData.count[i] = (bucketData.count[i] ?? 0) + 1;
            }
          }
        }

        // Snapshot cell voltages for supporting data
        const cellVoltages = cells.map((c) => Number(c.voltage.toFixed(4)));
        const commonRecord = {
          power: packStatus?.power,
          current: rawCurrent,
          timestamp: data.ts,
          temperatures: data.ss?.temperatures,
          stateOfCharge: packStatus?.stateOfCharge,
          cellVoltages,
          deltaCellVoltage: cellStatus?.deltaCellVoltage,
        };

        // Lowest voltage tracking
        const commonCellRecord = {
          ...commonRecord,
          cellNumber: cellStatus?.minVoltageCell,
          currentDraw: Math.abs(rawCurrent),
          packVoltage: Number(totalVoltage.toFixed(4)),
        } satisfies Partial<Type.LowestVoltageRecord>;

        const minCellVoltage = cellStatus?.minCellVoltage ?? 0;
        if (minCellVoltage > 0) {
          if (!this.lowestCellVoltage || minCellVoltage < this.lowestCellVoltage.voltage) {
            this.lowestCellVoltage = {
              ...commonCellRecord,
              voltage: Number(minCellVoltage.toFixed(4)),
              cellVoltage: Number(minCellVoltage.toFixed(4)),
            };
          }
        }
        if (totalVoltage > 0) {
          if (!this.lowestPackVoltage || totalVoltage < this.lowestPackVoltage.packVoltage) {
            this.lowestPackVoltage = {
              ...commonCellRecord,
              voltage: Number(totalVoltage.toFixed(4)),
              cellVoltage: minCellVoltage > 0 ? Number(minCellVoltage.toFixed(4)) : undefined,
            };
          }
        }

        // Highest pack cells deviation tracking
        const deltaCellVoltage = cellStatus?.deltaCellVoltage ?? 0;
        const maxCellVoltage = cellStatus?.maxCellVoltage ?? 0;
        if (cells.length > 0 && maxCellVoltage > 0) {
          if (!this.highestVoltageDeviation || deltaCellVoltage > this.highestVoltageDeviation.deviation) {
            this.highestVoltageDeviation = {
              ...commonRecord,
              deviation: Number(deltaCellVoltage.toFixed(4)),
              totalVoltage: Number(totalVoltage.toFixed(4)),
              minCellVoltage: Number(minCellVoltage.toFixed(4)),
              minVoltageCell: cellStatus?.minVoltageCell ?? 0,
              maxCellVoltage: Number(maxCellVoltage.toFixed(4)),
              maxVoltageCell: cellStatus?.maxVoltageCell ?? 0,
              averageCellVoltage: Number((cellStatus?.averageCellVoltage ?? 0).toFixed(4)),
            };
          }
        }

        // Overall & per-cell average voltages
        for (let i = 0; i < cells.length; i++) {
          const v = cells[i]?.voltage ?? 0;
          if (v > 0) {
            this.totalCellVoltageSum += v;
            this.totalCellVoltageCount++;
            this.cellSums[i] = (this.cellSums[i] ?? 0) + v;
            this.cellCounts[i] = (this.cellCounts[i] ?? 0) + 1;
          }
        }

        ctrl.enqueue(te.encode(prefix + JSON.stringify(data)));
      },

      flush: async () => {
        // prettier-ignore
        const cellSeries: Type.LayerChartSeries[] = [],
              cellVoltagePerSeries: Type.LayerChartPerSeries[] = [],
              cellVoltageByCurrent: Record<number, number[]> = {},
              cellVoltageCurrentChart: Type.CellDischargeRecord[] = [];

        const sortedBuckets = Array.from(this.currentBuckets.keys()).sort((a, b) => a - b);
        const activeCellIndices = new Set<number>();

        for (const bucket of sortedBuckets) {
          const record: Type.CellDischargeRecord = { current: bucket };
          const voltages: number[] = [];
          const bucketData = this.currentBuckets.get(bucket)!;

          for (let i = 0; i < bucketData.sum.length; i++) {
            const count = bucketData.count[i] ?? 0;
            const avg = count > 0 ? Number((bucketData.sum[i] / count).toFixed(4)) : 0;
            voltages.push(avg);

            const cellNumber = i + 1;
            if (avg > 0) {
              activeCellIndices.add(i);
              record[`cell_${cellNumber}`] = avg;
            }
          }

          cellVoltageByCurrent[bucket] = voltages;
          cellVoltageCurrentChart.push(record);
        }

        const sortedCellIndices = Array.from(activeCellIndices).sort((a, b) => a - b);
        for (const i of sortedCellIndices) {
          const cellNum = i + 1;
          const key = `cell_${cellNum}`;
          const label = `Cell ${cellNum}`;

          cellSeries.push({ key, label });

          const seriesPoints: Array<{ current: number; voltage: number }> = [];
          for (const bucket of sortedBuckets) {
            const bucketData = this.currentBuckets.get(bucket)!;
            const count = bucketData.count[i] ?? 0;
            if (count > 0) {
              seriesPoints.push({
                current: bucket,
                voltage: Number((bucketData.sum[i] / count).toFixed(4)),
              });
            }
          }

          cellVoltagePerSeries.push({ key, label, data: seriesPoints });
        }

        const voltCount = this.totalCellVoltageCount;
        const averageCellsVoltage =
          voltCount > 0 ? Number((this.totalCellVoltageSum / voltCount).toFixed(4)) : 0;

        const averageVoltagePerCell: number[] = [];
        for (let i = 0; i < this.cellSums.length; i++) {
          const count = this.cellCounts[i] ?? 0;
          averageVoltagePerCell.push(count > 0 ? Number((this.cellSums[i] / count).toFixed(4)) : 0);
        }

        const stats = {
          cellSeries,
          cellVoltageByCurrent,
          cellVoltagePerSeries,
          cellVoltageCurrentChart,

          lowestVoltage: this.lowestCellVoltage ?? this.lowestPackVoltage,
          lowestCellVoltage: this.lowestCellVoltage,
          lowestPackVoltage: this.lowestPackVoltage,
          averageCellsVoltage,
          averageVoltagePerCell,
          highestVoltageDeviation: this.highestVoltageDeviation,

          startedAt: this.startedAt,
          endedAt: this.endedAt,
          duration: this.startedAt && this.endedAt ? this.endedAt - this.startedAt : 0,
          sampleCount: this.sampleCount,
        };

        const data = te.encode(JSON.stringify(stats, null, 2));
        const response = new Response(data, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.byteLength.toString(),
          },
        });

        await (await cache).put(`${key}.json`, response);
      },
    });
  }

  get written() {
    return this.written_;
  }
}
