'use client';

import React from 'react';
import type { PredictedSale } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from 'lucide-react';

interface SalesForecastChartProps {
  predictedSales: PredictedSale[];
  summary: string;
}

export function SalesForecastChart({ predictedSales, summary }: SalesForecastChartProps) {
  if (!predictedSales || predictedSales.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-primary" /> Forecast Results
          </CardTitle>
          <CardDescription>No forecast data available yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Submit the form to generate a sales forecast.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = predictedSales.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), // Format date for chart
    sales: item.predictedSales,
  }));
  
  // Calculate min/max for YAxis domain to prevent tiny bars for small values
  const salesValues = chartData.map(d => d.sales);
  const minY = Math.min(0, ...salesValues); // Ensure Y-axis starts at 0 or below if negative sales possible
  const maxY = Math.max(...salesValues);
  const yAxisDomain = [minY, maxY + (maxY * 0.1)]; // Add 10% padding to max

  return (
    <Card className="shadow-lg col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-primary" /> Forecast Results
        </CardTitle>
        <CardDescription>Predicted sales for the upcoming period.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Sales Prediction Chart</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={yAxisDomain} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--popover-foreground))'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Predicted Sales"]}
                />
                <Legend wrapperStyle={{fontSize: "12px"}}/>
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Predicted Sales" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Trend Summary</h3>
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{summary || "No summary provided."}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Predicted Sales Data</h3>
          <ScrollArea className="h-[200px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Predicted Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {predictedSales.map((item) => (
                  <TableRow key={item.date}>
                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">${item.predictedSales.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
