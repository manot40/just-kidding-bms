import type { TemperatureData } from '@manot40/jk-bms';

export interface CellDischargeRecord {
  current: number;
  [cellKey: string]: number;
}

export interface LayerChartSeries {
  key: string;
  label: string;
}

export interface LayerChartPerSeries {
  key: string;
  label: string;
  data: Array<{ current: number; voltage: number }>;
}

export interface LowestVoltageRecord {
  voltage: number;
  cellNumber?: number;
  cellVoltage?: number;
  packVoltage: number;
  current: number;
  currentDraw: number;
  timestamp: number;
  power?: number;
  deltaCellVoltage?: number;
  stateOfCharge?: number;
  temperatures?: TemperatureData;
  cellVoltages?: number[];
}

export interface HighestDeviationRecord {
  deviation: number;
  deltaCellVoltage: number;
  timestamp: number;
  minCellVoltage: number;
  minVoltageCell: number;
  maxCellVoltage: number;
  maxVoltageCell: number;
  averageCellVoltage: number;
  current: number;
  totalVoltage: number;
  power?: number;
  stateOfCharge?: number;
  temperatures?: TemperatureData;
  cellVoltages?: number[];
}

export interface RecordStatistics {
  /**
   * LayerChart wide format: array of objects with `current` and cell properties (e.g. `cell1`, `cell_1`).
   * Used with `<LineChart data={...} x="current" series={...} />`
   */
  cellVoltageCurrentChart: CellDischargeRecord[];
  /** LayerChart series metadata array: `[{ key: 'cell1', label: 'Cell 1' }, ...]` */
  cellSeries?: LayerChartSeries[];
  /** LayerChart per-series format: array of series objects each containing their own `data` array. */
  cellVoltagePerSeries?: LayerChartPerSeries[];
  /** Grouped current bucket map { [current]: [cell1V, cell2V, ...] } */
  cellVoltageByCurrent?: Record<number, number[]>;

  lowestVoltage: LowestVoltageRecord;
  lowestCellVoltage?: LowestVoltageRecord;
  lowestPackVoltage?: LowestVoltageRecord;
  averageCellsVoltage: number;
  averageVoltagePerCell: number[];
  highestVoltageDeviation?: HighestDeviationRecord;
  sampleCount: number;
  duration: number;
  startedAt: number;
  endedAt: number;
}
