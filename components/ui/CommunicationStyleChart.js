"use client"

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { style: "Avoidant", value: 20 },
  { style: "Constructive", value: 80 },
  { style: "Hostile", value: 30 },
  { style: "Passive", value: 40 },
  { style: "Assertive", value: 60 },
]

const chartConfig = {
  value: {
    label: "Communication Style",
    color: "#9CA3AF",
  },
}

export function CommunicationStyleChart() {
  return (
    <Card className="bg-white border border-gray-100 shadow-sm">
      <CardContent className="p-6">
        <div className="text-lg font-medium text-gray-900 mb-6">Latest Communication Style Distribu.</div>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <RadarChart data={chartData}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="style" tick={{ fontSize: 12 }} />
            <Radar
              dataKey="value"
              fill="var(--color-value)"
              fillOpacity={0.6}
              stroke="#6B7280"
              strokeWidth={2}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}