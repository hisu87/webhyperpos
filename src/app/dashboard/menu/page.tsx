'use client';

import React, { useState } from 'react';
import { MenuItemCard } from '@/components/menu/MenuItemCard';
import { OrderSummary } from '@/components/menu/OrderSummary';
import { MOCK_MENU_ITEMS } from '@/lib/constants';
import type { MenuItem as MenuItemType, OrderItem } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function MenuPage() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const handleAddToCart = (item: MenuItemType, quantity: number, notes?: string) => {
    setOrderItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((oi) => oi.id === item.id);
      if (quantity <= 0) {
        // Remove item if quantity is zero or less
        return prevItems.filter((oi) => oi.id !== item.id);
      }
      if (existingItemIndex > -1) {
        // Update quantity if item exists
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = { ...updatedItems[existingItemIndex], quantity, notes: notes || updatedItems[existingItemIndex].notes };
        return updatedItems;
      } else {
        // Add new item if it doesn't exist
        return [...prevItems, { ...item, quantity, notes }];
      }
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setOrderItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  const handleClearOrder = () => {
    setOrderItems([]);
    toast({ title: "Order Cleared", description: "All items have been removed from the order." });
  };

  const handleCheckout = (paymentMethod: string) => {
    if (orderItems.length === 0) {
      toast({ title: "Empty Order", description: "Cannot checkout an empty order.", variant: "destructive" });
      return;
    }
    console.log('Checking out with:', paymentMethod, orderItems);
    toast({ 
        title: "Checkout Successful!", 
        description: `Paid with ${paymentMethod}. Order total: $${orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 1.08 /* with tax */toFixed(2)}`
    });
    setOrderItems([]); // Clear order after checkout
  };

  const categories = Array.from(new Set(MOCK_MENU_ITEMS.map(item => item.category)));
  
  const filteredMenuItems = MOCK_MENU_ITEMS.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-theme(spacing.24))]">
      <div className="lg:w-3/4 flex flex-col">
        <div className="p-4 bg-card rounded-lg shadow mb-4 sticky top-0 z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="Search menu items..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <Tabs defaultValue={categories[0] || 'all'} className="flex-grow flex flex-col">
          <TabsList className="mb-4 self-start">
            {categories.map(category => (
              <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
            ))}
          </TabsList>
          
          <div className="flex-grow overflow-auto pr-2">
            {categories.map(category => (
              <TabsContent key={category} value={category}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMenuItems.filter(item => item.category === category).map((item) => {
                    const orderItem = orderItems.find(oi => oi.id === item.id);
                    return (
                      <MenuItemCard 
                        key={item.id} 
                        item={item} 
                        onAddToCart={handleAddToCart} 
                        quantityInCart={orderItem?.quantity || 0}
                      />
                    );
                  })}
                </div>
              </TabsContent>
            ))}
            {/* Fallback for "all" or if no category selected / searchTerm active */}
             <TabsContent value="all"> 
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMenuItems.map((item) => {
                     const orderItem = orderItems.find(oi => oi.id === item.id);
                    return (
                       <MenuItemCard 
                        key={item.id} 
                        item={item} 
                        onAddToCart={handleAddToCart}
                        quantityInCart={orderItem?.quantity || 0}
                      />
                    );
                  })}
                </div>
              </TabsContent>
          </div>
        </Tabs>
      </div>
      <div className="lg:w-1/4">
        <OrderSummary 
          items={orderItems} 
          onRemoveItem={handleRemoveItem} 
          onClearOrder={handleClearOrder}
          onCheckout={handleCheckout} 
        />
      </div>
    </div>
  );
}
