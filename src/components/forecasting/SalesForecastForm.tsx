'use client';

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Wand2 } from 'lucide-react';
import type { HistoricalSale } from '@/lib/types';

const forecastFormSchema = z.object({
  historicalSalesData: z.string().min(1, "Historical data is required.")
    .refine((data) => {
      try {
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) return false;
        return parsed.every(item => typeof item.date === 'string' && typeof item.sales === 'number');
      } catch (e) {
        return false;
      }
    }, "Must be a valid JSON array of {date: string, sales: number} objects."),
  forecastDays: z.coerce.number().min(1, "Forecast days must be at least 1.").max(365, "Forecast days cannot exceed 365."),
});

type ForecastFormValues = z.infer<typeof forecastFormSchema>;

interface SalesForecastFormProps {
  onForecast: (data: ForecastFormValues) => Promise<void>;
  isForecasting: boolean;
}

const exampleHistoricalData: HistoricalSale[] = [
  { date: "2023-01-01", sales: 150 },
  { date: "2023-01-02", sales: 165 },
  { date: "2023-01-03", sales: 180 },
  { date: "2023-01-04", sales: 155 },
  { date: "2023-01-05", sales: 200 },
];

export function SalesForecastForm({ onForecast, isForecasting }: SalesForecastFormProps) {
  const form = useForm<ForecastFormValues>({
    resolver: zodResolver(forecastFormSchema),
    defaultValues: {
      historicalSalesData: JSON.stringify(exampleHistoricalData, null, 2),
      forecastDays: 7,
    },
  });

  const onSubmit: SubmitHandler<ForecastFormValues> = async (data) => {
    await onForecast(data);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Wand2 className="mr-2 h-5 w-5 text-primary" /> AI Sales Forecast
        </CardTitle>
        <CardDescription>
          Input historical sales data and the number of days to forecast.
          The AI will predict future sales trends.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="historicalSalesData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="historicalSalesData">Historical Sales Data (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      id="historicalSalesData"
                      rows={10}
                      placeholder='e.g., [{"date": "YYYY-MM-DD", "sales": 100}, ...]'
                      {...field}
                      className="font-code text-sm"
                    />
                  </FormControl>
                  <FormDescription>
                    Provide data as a JSON array: <code>[{`"date": "YYYY-MM-DD", "sales": number`}]</code>.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="forecastDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="forecastDays">Forecast Days</FormLabel>
                  <FormControl>
                    <Input id="forecastDays" type="number" placeholder="e.g., 7" {...field} />
                  </FormControl>
                  <FormDescription>
                    Number of days into the future to forecast (1-365).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isForecasting}>
              {isForecasting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              {isForecasting ? 'Forecasting...' : 'Generate Forecast'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
