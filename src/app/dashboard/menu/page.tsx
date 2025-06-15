
'use client';

import React, { useState, useEffect } from 'react';
import { MenuItemCard } from '@/components/menu/MenuItemCard';
import { OrderSummary } from '@/components/menu/OrderSummary';
import type { Menu, MenuItem as NewMenuItemType, CartItem, OrderItem as NewOrderItemType } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, collectionGroup } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MenuPage() {
  const [orderItems, setOrderItems] = useState<NewOrderItemType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<Menu | null>(null);
  const [menuItems, setMenuItems] = useState<NewMenuItemType[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const { toast } = useToast();

  // Assume selectedTenantId is stored in localStorage after tenant/branch selection
  // In a real app, this might come from context or a global state manager
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  useEffect(() => {
    const storedTenantId = localStorage.getItem('selectedTenantId');
    if (storedTenantId) {
      setSelectedTenantId(storedTenantId);
    } else {
      setMenuError("Tenant ID not found. Please select a tenant first.");
      setIsLoadingMenu(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedTenantId) return;

    setIsLoadingMenu(true);
    setMenuError(null);

    // Fetch active menu for the tenant
    const menusQuery = query(
      collection(db, "menus"),
      where("tenant.id", "==", selectedTenantId),
      where("isActive", "==", true)
    );

    const unsubscribeMenu = onSnapshot(menusQuery, async (snapshot) => {
      if (snapshot.empty) {
        setMenuError("No active menu found for this tenant.");
        setActiveMenu(null);
        setMenuItems([]);
        setIsLoadingMenu(false);
        return;
      }
      
      const menuDoc = snapshot.docs[0]; // Assuming only one active menu per tenant for now
      const menuData = { id: menuDoc.id, ...menuDoc.data() } as Menu;
      setActiveMenu(menuData);

      // Fetch items for this active menu
      const itemsCollectionRef = collection(db, "menus", menuDoc.id, "items");
      const unsubscribeItems = onSnapshot(itemsCollectionRef, (itemsSnapshot) => {
        const fetchedItems: NewMenuItemType[] = itemsSnapshot.docs.map(itemDoc => ({
          id: itemDoc.id,
          ...itemDoc.data()
        } as NewMenuItemType));
        setMenuItems(fetchedItems);
        setIsLoadingMenu(false);
      }, (error) => {
        console.error("Error fetching menu items:", error);
        setMenuError("Failed to load menu items.");
        setIsLoadingMenu(false);
      });
      return () => unsubscribeItems(); // Cleanup items listener

    }, (error) => {
      console.error("Error fetching active menu:", error);
      setMenuError("Failed to load active menu.");
      setActiveMenu(null);
      setMenuItems([]);
      setIsLoadingMenu(false);
    });

    return () => unsubscribeMenu(); // Cleanup menu listener
  }, [selectedTenantId]);

  const handleAddToCart = (item: NewMenuItemType, quantity: number, notes?: string) => {
    setOrderItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((oi) => oi.menuItemId === item.id); // Check against menuItemId
      if (quantity <= 0) {
        return prevItems.filter((oi) => oi.menuItemId !== item.id);
      }
      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = { ...updatedItems[existingItemIndex], quantity, note: notes || updatedItems[existingItemIndex].note };
        return updatedItems;
      } else {
        // Create a new OrderItem
        const newOrderItem: NewOrderItemType = {
          id: `${item.id}-${Date.now()}`, // Temporary local ID for the order item
          menuItemId: item.id,
          menuItemName: item.name,
          unitPrice: item.price,
          quantity,
          note,
        };
        return [...prevItems, newOrderItem];
      }
    });
  };
  
  const handleRemoveItem = (orderItemId: string) => { // orderItemId is the persisted OrderItem.id
    setOrderItems((prevItems) => prevItems.filter((item) => item.id !== orderItemId));
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
    // In a real app, this would persist the order to Firestore /branches/{branchId}/orders/{orderId}
    console.log('Checking out with:', paymentMethod, orderItems);
    const orderTotalWithTax = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 1.08; // Assuming 8% tax
    toast({ 
        title: "Checkout Successful!", 
        description: `Paid with ${paymentMethod}. Order total: $${orderTotalWithTax.toFixed(2)}`
    });
    setOrderItems([]);
  };

  const categories = Array.from(new Set(menuItems.map(item => item.category))).sort();
  
  const filteredMenuItems = menuItems.filter(item => 
    item.available && // Only show available items
    (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoadingMenu) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading menu...</p>
      </div>
    );
  }

  if (menuError) {
    return (
      <div className="flex flex-col justify-center items-center h-full">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error Loading Menu</AlertTitle>
          <AlertDescription>{menuError}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!activeMenu || menuItems.length === 0) {
     return (
      <div className="flex flex-col justify-center items-center h-full">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">No menu items available for the selected tenant.</p>
      </div>
    );
  }

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
              <TabsContent key={category} value={category} className="mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMenuItems.filter(item => item.category === category).map((item) => {
                    const orderItemInstance = orderItems.find(oi => oi.menuItemId === item.id);
                    return (
                      <MenuItemCard 
                        key={item.id} 
                        item={item} 
                        onAddToCart={handleAddToCart} 
                        quantityInCart={orderItemInstance?.quantity || 0}
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
                     const orderItemInstance = orderItems.find(oi => oi.menuItemId === item.id);
                    return (
                       <MenuItemCard 
                        key={item.id} 
                        item={item} 
                        onAddToCart={handleAddToCart}
                        quantityInCart={orderItemInstance?.quantity || 0}
                      />
                    );
                  })}
                </div>
              </TabsContent>
              {filteredMenuItems.length === 0 && searchTerm && (
                 <div className="text-center py-10">
                    <p className="text-xl text-muted-foreground">No menu items found for "{searchTerm}".</p>
                 </div>
              )}
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
