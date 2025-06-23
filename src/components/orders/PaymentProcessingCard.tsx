'use client';

import * as React from 'react';
import type { Order as OrderType, OrderItem as OrderItemType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Percent, DivideSquare, Loader2 } from 'lucide-react';
import { PAYMENT_METHODS } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PaymentProcessingCardProps {
  order: OrderType;
  items: OrderItemType[];
  onCompletePayment: (paymentMethod: string) => void;
  isProcessing: boolean;
}

export function PaymentProcessingCard({ order, items, onCompletePayment, isProcessing }: PaymentProcessingCardProps) {
  const [paymentMethod, setPaymentMethod] = React.useState<string | undefined>(undefined);
  
  const subtotal = items.reduce((sum, item) => sum + (item.menuItem?.price || 0) * item.quantity, 0);
  const taxRate = 0.08; 
  const tax = subtotal * taxRate;
  
  // Use the finalAmount from the order object if it exists, otherwise calculate it.
  const finalAmount = order.finalAmount || (subtotal + tax);

  return (
    <Card className="sticky top-20 shadow-lg">
      <CardHeader>
        <CardTitle>Payment</CardTitle>
        <CardDescription>Finalize payment for order #{order.orderNumber}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <div className="flex justify-between">
                <p>Subtotal:</p>
                <p>${subtotal.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
                <p>Tax ({(taxRate * 100).toFixed(0)}%):</p>
                <p>${tax.toFixed(2)}</p>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold text-primary">
                <p>Total Due:</p>
                <p>${finalAmount.toFixed(2)}</p>
            </div>
        </div>
        <Separator />
         <div className="space-y-2">
            <label htmlFor="payment-method-select" className="text-sm font-medium">Payment Method</label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method-select">
                    <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                    {PAYMENT_METHODS.map(method => (
                        <SelectItem key={method.id} value={method.name}>
                            {method.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full pt-2">
            <Button variant="outline" disabled>
              <DivideSquare className="mr-2 h-4 w-4" /> Split Bill
            </Button>
            <Button variant="outline" disabled>
              <Percent className="mr-2 h-4 w-4" /> Apply Discount
            </Button>
        </div>
      </CardContent>
      <CardFooter>
          <Button 
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90" 
            onClick={() => paymentMethod && onCompletePayment(paymentMethod)}
            disabled={!paymentMethod || isProcessing}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
            {isProcessing ? 'Processing...' : `Pay $${finalAmount.toFixed(2)}`}
          </Button>
      </CardFooter>
    </Card>
  );
}
