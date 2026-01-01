import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useUnit } from '../contexts/UnitContext';
import { formatPace, getPaceUnit } from '../utils/unitConversions';
import type { CheckpointSplitAnalysis } from '../../shared/types';

interface PacingChartProps {
  splits: CheckpointSplitAnalysis[];
}

const PacingChart: React.FC<PacingChartProps> = ({ splits }) => {
  const { useMiles } = useUnit();

  // Prepare data for the chart
  const chartData = splits.map((split, index) => ({
    checkpoint: index + 1,
    name: split.checkpointName,
    plannedPace: split.plannedPace,
    actualPace: split.actualPace,
    distance: split.cumulativeDistance,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis
          dataKey="checkpoint"
          stroke="#9ca3af"
          label={{ value: 'Checkpoint', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          stroke="#9ca3af"
          label={{ value: `Pace (min${getPaceUnit(useMiles)})`, angle: -90, position: 'insideLeft' }}
          tickFormatter={(pace: number) => formatPace(pace, useMiles).replace(getPaceUnit(useMiles), '')}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e2639',
            border: '1px solid #374151',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#fff' }}
          formatter={(value: number) => formatPace(value, useMiles)}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="plannedPace"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', r: 4 }}
          name="Planned Pace"
        />
        <Line
          type="monotone"
          dataKey="actualPace"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          name="Actual Pace"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default PacingChart;
