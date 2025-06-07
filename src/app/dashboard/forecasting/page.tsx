'use client';

import React, { useState } from 'react';
import { SalesForecastForm } from '@/components/forecasting/SalesForecastForm';
import { SalesForecastChart } from '@/components/forecasting/SalesForecastChart';
import { forecastSales, SalesForecastingInput, SalesForecastingOutput } from '@/ai/flows/sales-forecasting';
import type { PredictedSale } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function ForecastingPage() {
  const [forecastResult, setForecastResult] = useState<SalesForecastingOutput | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleForecast = async (data: SalesForecastingInput) => {
    setIsForecasting(true);
    setError(null);
    setForecastResult(null); 
    try {
      const result = await forecastSales(data);
      // Ensure predictedSales is parsed if it's a string
      let parsedPredictedSales: PredictedSale[];
      if (typeof result.predictedSales === 'string') {
        try {
          parsedPredictedSales = JSON.parse(result.predictedSales);
          // Validate structure
           if (!Array.isArray(parsedPredictedSales) || !parsedPredictedSales.every(item => typeof item.date === 'string' && (typeof item.sales === 'number' || typeof item.predictedSales === 'number'))) {
             throw new Error("Parsed predictedSales is not in the expected format.");
           }
           // Normalize key if AI uses 'sales' instead of 'predictedSales'
           parsedPredictedSales = parsedPredictedSales.map(item => ({
             date: item.date,
             predictedSales: (item as any).sales !== undefined ? (item as any).sales : item.predictedSales
           }));

        } catch (parseError) {
          console.error("Failed to parse predictedSales:", parseError);
          throw new Error("AI returned an invalid format for predicted sales data.");
        }
      } else {
        // This case should ideally not happen based on schema, but good to handle
        parsedPredictedSales = result.predictedSales as unknown as PredictedSale[];
      }

      setForecastResult({ ...result, predictedSales: parsedPredictedSales as any }); // Use parsed data
      toast({ title: "Forecast Generated!", description: "Sales forecast has been successfully generated." });
    } catch (e: any) {
      console.error("Forecasting error:", e);
      const errorMessage = e.message || "An unexpected error occurred during forecasting.";
      setError(errorMessage);
      toast({ title: "Forecasting Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsForecasting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SalesForecastForm onForecast={handleForecast} isForecasting={isForecasting} />
        </div>
        <div className="lg:col-span-2">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <SalesForecastChart 
            predictedSales={forecastResult?.predictedSales as unknown as PredictedSale[] || []} 
            summary={forecastResult?.summary || ''} 
          />
        </div>
      </div>
    </div>
  );
}
