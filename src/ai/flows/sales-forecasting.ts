// Sales forecasting flow
'use server';
/**
 * @fileOverview Implements the AI-powered sales forecasting tool for cafe owners.
 *
 * - forecastSales - A function that forecasts sales based on historical data.
 * - SalesForecastingInput - The input type for the forecastSales function.
 * - SalesForecastingOutput - The return type for the forecastSales function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SalesForecastingInputSchema = z.object({
  historicalSalesData: z
    .string()
    .describe(
      'Historical sales data, as a JSON string.  Each entry should contain date and sales fields.'
    ),
  forecastDays: z
    .number()
    .describe('Number of days into the future to forecast sales.'),
});
export type SalesForecastingInput = z.infer<typeof SalesForecastingInputSchema>;

const SalesForecastingOutputSchema = z.object({
  predictedSales: z
    .string()
    .describe(
      'Predicted sales data, as a JSON string.  Each entry should contain date and sales fields.'
    ),
  summary: z
    .string()
    .describe('A summary of the predicted sales trends and insights.'),
});
export type SalesForecastingOutput = z.infer<typeof SalesForecastingOutputSchema>;

export async function forecastSales(input: SalesForecastingInput): Promise<SalesForecastingOutput> {
  return forecastSalesFlow(input);
}

const forecastSalesPrompt = ai.definePrompt({
  name: 'forecastSalesPrompt',
  input: {schema: SalesForecastingInputSchema},
  output: {schema: SalesForecastingOutputSchema},
  prompt: `You are an AI sales forecasting expert. Analyze the provided historical sales data and predict future sales trends.

Historical Sales Data: {{{historicalSalesData}}}

Forecast Horizon: {{{forecastDays}}} days

Provide the predicted sales data as a JSON string, and include a summary of the trends and insights.

Ensure the predictedSales data includes the date and predicted sales for each day in the forecast horizon.
`,
});

const forecastSalesFlow = ai.defineFlow(
  {
    name: 'forecastSalesFlow',
    inputSchema: SalesForecastingInputSchema,
    outputSchema: SalesForecastingOutputSchema,
  },
  async input => {
    const {output} = await forecastSalesPrompt(input);
    return output!;
  }
);
