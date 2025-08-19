"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { session: 0, sentiment: 4 },
  { session: 2, sentiment: 3 },
  { session: 4, sentiment: 5 },
  { session: 6, sentiment: 4 },
  { session: 8, sentiment: 2 },
  { session: 10, sentiment: 1.5 },
  { session: 12, sentiment: 0.5 },
  { session: 14, sentiment: 1 },
  { session: 16, sentiment: 1.2 },
]

const chartConfig = {
  sentiment: {
    label: "Sentiment",
    color: "#000000",
  },
}

export function SentimentTrendChart() {
  return (
    <Card className="bg-white border border-gray-100 shadow-sm">
      <CardContent className="p-6">
        <div className="text-lg font-medium text-gray-900 mb-6">Sentiment Trend</div>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid strokeDasharray="none" stroke="#e5e7eb" />
            <XAxis
              dataKey="session"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 16]}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 10]}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey="sentiment"
              type="natural"
              stroke="var(--color-sentiment)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}