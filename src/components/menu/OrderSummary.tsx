
'use client';

import * as React from 'react'; 
import type { OrderItem as NewOrderItemType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2, CreditCard, DivideSquare, Percent, Save, Loader2, Edit } from 'lucide-react';
import { PAYMENT_METHODS } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface OrderSummaryProps {
  items: NewOrderItemType[];
  onRemoveItem: (itemId: string) => void;
  onClearOrder: () => void;
  onCheckout: (paymentMethod: string) => void;
  onSaveOrder?: () => void;
  isSavingOrder?: boolean;
  selectedTable?: {id: string; number: string} | null;
  isEditing?: boolean;
}

export function OrderSummary({ items, onRemoveItem, onClearOrder, onCheckout, onSaveOrder, isSavingOrder, selectedTable, isEditing }: OrderSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + (item.menuItem?.price || 0) * item.quantity, 0);
  const taxRate = 0.08; 
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const [paymentMethod, setPaymentMethod] = React.useState<string | undefined>(PAYMENT_METHODS[0]?.id);


  return (
    <Card className="sticky top-20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">{isEditing ? "Edit Order" : "Current Order"}</CardTitle>
        <CardDescription>{selectedTable ? `For Table ${selectedTable.number}` : 'Review your items before checkout.'}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground">Your order is empty.</p>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.menuItem?.name || 'Unknown Item'} <span className="text-xs text-muted-foreground">x{item.quantity}</span></p>
                    {item.note && <p className="text-xs text-muted-foreground italic">Note: {item.note}</p>}
                    <p className="text-sm text-muted-foreground">${(item.menuItem?.price || 0).toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">${((item.menuItem?.price || 0) * item.quantity).toFixed(2)}</p>
                    <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.id)} aria-label="Remove item">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        {items.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <p>Subtotal:</p>
                <p>${subtotal.toFixed(2)}</p>
              </div>
              <div className="flex justify-between">
                <p>Tax ({(taxRate * 100).toFixed(0)}%):</p>
                <p>${tax.toFixed(2)}</p>
              </div>
              <div className="flex justify-between text-lg font-bold text-primary">
                <p>Total:</p>
                <p>${total.toFixed(2)}</p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
                <label htmlFor="payment-method-select" className="text-sm font-medium">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="payment-method-select">
                        <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                        {PAYMENT_METHODS.map(method => (
                            <SelectItem key={method.id} value={method.id}>
                                {method.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </>
        )}
      </CardContent>
      {items.length > 0 && (
        <CardFooter className="flex-col space-y-2">
           {(selectedTable || isEditing) && onSaveOrder && (
              <Button
                  variant="secondary"
                  className="w-full"
                  onClick={onSaveOrder}
                  disabled={isSavingOrder || items.length === 0}
              >
                  {isSavingOrder ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    isEditing ? <Edit className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />
                  )}
                  {isSavingOrder ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update Order' : 'Save Order to Table')}
              </Button>
           )}
           <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" onClick={() => {/* Implement split bill */}}>
              <DivideSquare className="mr-2 h-4 w-4" /> Split Bill
            </Button>
            <Button variant="outline" onClick={() => {/* Implement discount */}}>
              <Percent className="mr-2 h-4 w-4" /> Apply Discount
            </Button>
          </div>
          <Button 
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90" 
            onClick={() => paymentMethod && onCheckout(paymentMethod)}
            disabled={!paymentMethod || items.length === 0}
          >
            <CreditCard className="mr-2 h-4 w-4" /> Checkout
          </Button>
          <Button variant="destructive" className="w-full" onClick={onClearOrder}>
            <Trash2 className="mr-2 h-4 w-4" /> Clear Order
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
