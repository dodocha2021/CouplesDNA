import React from "react";
import {
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import {
  ArrowUp,
  BarChart,
  MessageSquare,
  Upload,
  TrendingUp
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useRouter } from "next/router";

// Mock data for charts
const sentimentData = [
  { month: "Jan", communication: 65, intimacy: 45 },
  { month: "Feb", communication: 70, intimacy: 52 },
  { month: "Mar", communication: 68, intimacy: 61 },
  { month: "Apr", communication: 76, intimacy: 67 },
  { month: "May", communication: 82, intimacy: 73 },
  { month: "Jun", communication: 85, intimacy: 80 },
];

const communicationStyleData = [
  { subject: 'Constructive', value: 35, fullMark: 100 },
  { subject: 'Supportive', value: 25, fullMark: 100 },
  { subject: 'Direct', value: 20, fullMark: 100 },
  { subject: 'Emotional', value: 15, fullMark: 100 },
  { subject: 'Avoidant', value: 5, fullMark: 100 },
];

export default function DashboardContent() {
  const router = useRouter();

  const handleUploadClick = () => {
    router.push('/questionnaire');
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">+5 since last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Sentiment</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7.4</div>
            <div className="flex items-center text-green-600 text-xs">
              <ArrowUp size={14} className="mr-0.5" />
              <span>0.8 vs last report</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Communicative Style</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Constructive</div>
            <p className="text-xs text-muted-foreground">Your dominant style</p>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle>Upload Chat Record</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Get a new in-depth analysis report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="secondary" 
              className="w-full" 
              onClick={handleUploadClick}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload and Start
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Sentiment Trend Analysis</CardTitle>
            <CardDescription>Communication vs. Intimacy over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" strokeWidth={0} />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} strokeWidth={0} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "var(--radius)",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--background))",
                  }}
                />
                <Line type="monotone" dataKey="communication" stroke="hsl(var(--primary))" strokeWidth={2} name="Communication" />
                <Line type="monotone" dataKey="intimacy" stroke="hsl(var(--secondary))" strokeWidth={2} name="Intimacy" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Communication Style Distribution</CardTitle>
            <CardDescription>Your primary communication archetypes.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart outerRadius="70%" data={communicationStyleData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={90} domain={[0, 40]} />
                <Radar name="Style" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "var(--radius)",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--background))",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}