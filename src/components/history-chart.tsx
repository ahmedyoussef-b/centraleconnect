
'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip, Legend } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { fr } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';

// Generate mock data for the last 24 hours
const generateChartData = () => {
  const data = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const tg1Power = 130 + Math.random() * 15 - 7.5;
    const tg2Power = 135 + Math.random() * 10 - 5;
    const tvPower = 180 + Math.random() * 20 - 10;
    data.push({
      time: time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      TG1: tg1Power > 0 ? parseFloat(tg1Power.toFixed(1)) : 0,
      TG2: tg2Power > 0 ? parseFloat(tg2Power.toFixed(1)) : 0,
      TV: tvPower > 0 ? parseFloat(tvPower.toFixed(1)) : 0,
      Total: parseFloat((tg1Power + tg2Power + tvPower).toFixed(1)),
    });
  }
  return data;
};

const chartConfig = {
  TG1: {
    label: 'Puissance TG1',
    color: 'hsl(var(--chart-1))',
  },
  TG2: {
    label: 'Puissance TG2',
    color: 'hsl(var(--chart-2))',
  },
  TV: {
    label: 'Puissance TV',
    color: 'hsl(var(--chart-3))',
  },
  Total: {
    label: 'Total CCPP',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export function HistoryChart() {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    setChartData(generateChartData());
  }, []);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique de Puissance (24h)</CardTitle>
          <CardDescription>Évolution des puissances actives (MW)</CardDescription>
        </CardHeader>
        <CardContent>
            <Skeleton className="h-[300px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique de Puissance (24h)</CardTitle>
        <CardDescription>Évolution des puissances actives (MW)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 10,
              left: 10,
              bottom: 0,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value, index) => (index % 4 === 0 ? value : '')}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              label={{ value: 'MW', angle: -90, position: 'insideLeft', offset: -5 }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
             <Legend />
            <Line
              dataKey="TG1"
              type="monotone"
              stroke="var(--color-TG1)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="TG2"
              type="monotone"
              stroke="var(--color-TG2)"
              strokeWidth={2}
              dot={false}
            />
             <Line
              dataKey="TV"
              type="monotone"
              stroke="var(--color-TV)"
              strokeWidth={2}
              dot={false}
            />
             <Line
              dataKey="Total"
              type="monotone"
              stroke="var(--color-Total)"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
