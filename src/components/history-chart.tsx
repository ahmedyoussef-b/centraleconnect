
'use client';

import { TrendingUp, Info } from 'lucide-react';
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
import { Alert, AlertDescription } from './ui/alert';

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
} satisfies ChartConfig;

export function HistoryChart({ data }: { data: any[] }) {

  const totalPower = data.length > 0 ? (data[data.length - 1].TG1 + data[data.length - 1].TG2 + data[data.length - 1].TV).toFixed(1) : '0.0';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique Temps Réel</CardTitle>
        <CardDescription>Évolution des puissances actives (MW). Total CCPP : <span className="font-bold text-primary">{totalPower} MW</span></CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 2 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart
                data={data}
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
                tickFormatter={(value, index) => (index % Math.floor(data.length / 6) === 0 ? value : '')}
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
            </LineChart>
            </ChartContainer>
        ) : (
            <div className="h-[300px] flex items-center justify-center">
                <Alert className="w-auto">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        En attente de données suffisantes pour afficher le graphique...
                    </AlertDescription>
                </Alert>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
