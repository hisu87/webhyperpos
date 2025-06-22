
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MenuItemCard } from '@/components/menu/MenuItemCard';
import { OrderSummary } from '@/components/menu/OrderSummary';
import type { Menu, MenuItem as NewMenuItemType, Order, OrderItem as NewOrderItemType, User as AppUser } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, AlertTriangle, Save, Edit } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { initializeFirebaseClient, db as getDbInstance, auth as getAuthInstance } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, writeBatch, Timestamp, limit, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MenuPage() {
  const [orderItems, setOrderItems] = useState<NewOrderItemType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<Menu | null>(null);
  const [menuItems, setMenuItems] = useState<NewMenuItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  
  const searchParams = useSearchParams();
  const [selectedTable, setSelectedTable] = useState<{id: string; number: string} | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);


  // Effect to handle initial setup from URL params
  useEffect(() => {
    const tableId = searchParams.get('tableId');
    const tableNumber = searchParams.get('tableNumber');
    const orderIdToEdit = searchParams.get('orderId');

    if (tableId && tableNumber) {
        setSelectedTable({ id: tableId, number: tableNumber });
    }
    if (orderIdToEdit) {
        setEditingOrderId(orderIdToEdit);
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      initializeFirebaseClient();
      setFirebaseInitialized(true);
    } catch (e) {
      console.error("Error initializing Firebase in MenuPage:", e);
      setError("Failed to initialize core services. Please refresh.");
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (!firebaseInitialized) return;
    const auth = getAuthInstance();
    if (!auth) return;

    const unsubscribeAuth = auth.onAuthStateChanged(user => {
        setCurrentUser(user);
    });

    return () => unsubscribeAuth();
  }, [firebaseInitialized]);

  useEffect(() => {
      if (!firebaseInitialized || !currentUser) {
          setUserProfile(null);
          return;
      }
      const db = getDbInstance();
      if (!db) return;

      const userQuery = query(collection(db, 'users'), where('firebaseUid', '==', currentUser.uid), limit(1));
      const unsubscribeProfile = onSnapshot(userQuery, (snapshot) => {
          if (!snapshot.empty) {
              const userDoc = snapshot.docs[0];
              setUserProfile({ id: userDoc.id, ...userDoc.data() } as AppUser);
          } else {
              console.warn("No profile found for current user");
              setUserProfile(null);
          }
      }, (error) => {
          console.error("Error fetching user profile:", error);
          toast({ title: "Error", description: "Could not fetch user profile.", variant: "destructive" });
      });

      return () => unsubscribeProfile();
  }, [currentUser, firebaseInitialized, toast]);


  useEffect(() => {
    if (!firebaseInitialized) return;

    const storedTenantId = localStorage.getItem('selectedTenantId');
    if (storedTenantId) {
      setSelectedTenantId(storedTenantId);
    } else {
      setError("Tenant ID not found. Please select a tenant first.");
      setIsLoading(false);
    }
  }, [firebaseInitialized]);

  // Effect to load menu
  useEffect(() => {
    if (!selectedTenantId || !firebaseInitialized) {
      if(firebaseInitialized && !selectedTenantId && !localStorage.getItem('selectedTenantId')) {
         setError("Tenant ID not available for menu loading.");
      }
      setIsLoading(false);
      return;
    }

    const db = getDbInstance();
    if (!db) {
      setError("Database service not available.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const menusQuery = query(
      collection(db, "menus"),
      where("tenant.id", "==", selectedTenantId),
      where("isActive", "==", true)
    );

    const unsubscribeMenu = onSnapshot(menusQuery, async (snapshot) => {
      if (snapshot.empty) {
        setError("No active menu found for this tenant.");
        setActiveMenu(null);
        setMenuItems([]);
        setIsLoading(false);
        return;
      }
      
      const menuDoc = snapshot.docs[0];
      const menuData = { id: menuDoc.id, ...menuDoc.data() } as Menu;
      setActiveMenu(menuData);

      const itemsCollectionRef = collection(db, "menus", menuDoc.id, "items");
      const unsubscribeItems = onSnapshot(itemsCollectionRef, (itemsSnapshot) => {
        const fetchedItems: NewMenuItemType[] = itemsSnapshot.docs.map(itemDoc => ({
          id: itemDoc.id,
          ...itemDoc.data(),
          menu: menuData ? { id: menuData.id, name: menuData.name } : { id: '', name: ''}
        } as NewMenuItemType));
        setMenuItems(fetchedItems);
        // Loading is set to false in the edit order effect if applicable
        if (!editingOrderId) {
            setIsLoading(false);
        }
      }, (error) => {
        console.error("Error fetching menu items:", error);
        setError("Failed to load menu items.");
        setIsLoading(false);
      });
      return () => unsubscribeItems();

    }, (error) => {
      console.error("Error fetching active menu:", error);
      setError("Failed to load active menu.");
      setActiveMenu(null);
      setMenuItems([]);
      setIsLoading(false);
    });

    return () => unsubscribeMenu();
  }, [selectedTenantId, firebaseInitialized, editingOrderId]);

  // Effect to load an existing order for editing
  useEffect(() => {
    if (!editingOrderId || !firebaseInitialized) {
        return;
    }
    const db = getDbInstance();
    const branchId = localStorage.getItem('selectedBranchId');

    if (!db || !branchId) {
        setError("Cannot edit order: missing context (db or branchId).");
        setIsLoading(false);
        return;
    }
    
    setIsLoading(true);
    const orderItemsRef = collection(db, "branches", branchId, "orders", editingOrderId, "items");
    getDocs(orderItemsRef).then(snapshot => {
        const existingItems = snapshot.docs.map(doc => doc.data() as NewOrderItemType);
        setOrderItems(existingItems);
        setIsLoading(false);
    }).catch(err => {
        console.error("Error loading order items for editing:", err);
        setError("Failed to load the order to be edited.");
        setIsLoading(false);
    });

  }, [editingOrderId, firebaseInitialized]);

  const handleAddToCart = (item: NewMenuItemType, quantity: number, notes?: string) => {
    setOrderItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((oi) => oi.menuItem?.id === item.id && oi.note === (notes || undefined));
      if (quantity <= 0) {
        return prevItems.filter((oi) => oi.menuItem?.id !== item.id || oi.note !== (notes || undefined));
      }
      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = { ...updatedItems[existingItemIndex], quantity, note: notes || updatedItems[existingItemIndex].note };
        return updatedItems;
      } else {
        const newOrderItem: NewOrderItemType = {
          id: `${item.id}-${Date.now()}`, 
          menuItem: {
             id: item.id, 
             name: item.name, 
             price: item.price, 
             unit: item.unit 
          },
          quantity,
          note: notes,
        };
        return [...prevItems, newOrderItem];
      }
    });
  };
  
  const handleRemoveItem = (orderItemId: string) => {
    setOrderItems((prevItems) => prevItems.filter((item) => item.id !== orderItemId));
  };

  const handleClearOrder = () => {
    setOrderItems([]);
    toast({ title: "Order Cleared", description: "All items have been removed from the order." });
  };

  const handleSaveOrUpdateOrder = async () => {
    if (editingOrderId) {
        await handleUpdateOrder();
    } else {
        await handleSaveOrder();
    }
  };

  const handleUpdateOrder = async () => {
    if (!editingOrderId) return;
    if (orderItems.length === 0) {
        toast({ title: "Empty Order", description: "Cannot update to an empty order. Consider cancelling instead.", variant: "destructive" });
        return;
    }
    const branchId = localStorage.getItem('selectedBranchId');
    if (!branchId) {
        toast({ title: "Branch Error", description: "Could not identify the current branch.", variant: "destructive" });
        return;
    }

    setIsSavingOrder(true);
    const db = getDbInstance();
    if (!db) {
        toast({ title: "Database Error", description: "Could not connect to the database.", variant: "destructive" });
        setIsSavingOrder(false);
        return;
    }

    const batch = writeBatch(db);
    const orderRef = doc(db, "branches", branchId, "orders", editingOrderId);
    const subtotal = orderItems.reduce((sum, item) => sum + (item.menuItem?.price || 0) * item.quantity, 0);

    // 1. Delete existing items
    const itemsCollectionRef = collection(db, "branches", branchId, "orders", editingOrderId, "items");
    const existingItemsSnapshot = await getDocs(itemsCollectionRef);
    existingItemsSnapshot.forEach(doc => batch.delete(doc.ref));

    // 2. Add current items
    for (const item of orderItems) {
        const orderItemRef = doc(collection(db, "branches", branchId, "orders", editingOrderId, "items"));
        const firestoreOrderItem: Omit<NewOrderItemType, 'id'> & { note?: string } = {
            menuItem: item.menuItem,
            quantity: item.quantity,
            createdAt: Timestamp.now(), // Consider keeping original if available
            updatedAt: Timestamp.now(),
        };
        if (item.note) {
            firestoreOrderItem.note = item.note;
        }
        batch.set(orderItemRef, firestoreOrderItem);
    }

    // 3. Update order totals and timestamp
    batch.update(orderRef, {
        totalAmount: subtotal,
        finalAmount: subtotal, // Add discounts/tax logic here if needed
        updatedAt: Timestamp.now(),
    });

    try {
        await batch.commit();
        toast({
            title: "Order Updated!",
            description: `Order has been successfully updated.`,
        });
        setOrderItems([]);
        router.push(`/dashboard/orders/${editingOrderId}`);
    } catch (error) {
        console.error("Error updating order:", error);
        toast({ title: "Update Failed", description: "Could not update the order.", variant: "destructive" });
    } finally {
        setIsSavingOrder(false);
    }
  };

  const handleSaveOrder = async () => {
    if (!selectedTable) {
        toast({ title: "No Table Selected", description: "Please select a table to save the order.", variant: "destructive" });
        return;
    }
    if (orderItems.length === 0) {
        toast({ title: "Empty Order", description: "Cannot save an empty order.", variant: "destructive" });
        return;
    }
    if (!userProfile) {
        toast({ title: "User Not Found", description: "Could not identify the current user. Please try again.", variant: "destructive" });
        return;
    }
     if (!selectedTenantId || !activeMenu?.tenant?.name) {
        toast({ title: "Tenant Not Found", description: "Could not identify the current tenant.", variant: "destructive" });
        return;
    }
    const branchId = localStorage.getItem('selectedBranchId');
    const branchName = localStorage.getItem('selectedBranchName');
    if (!branchId || !branchName) {
        toast({ title: "Branch Error", description: "Could not identify the current branch.", variant: "destructive" });
        return;
    }
    
    setIsSavingOrder(true);
    const db = getDbInstance();
    if (!db) {
        toast({ title: "Database Error", description: "Could not connect to the database.", variant: "destructive" });
        setIsSavingOrder(false);
        return;
    }

    const batch = writeBatch(db);

    const orderRef = doc(collection(db, "branches", branchId, "orders"));
    const subtotal = orderItems.reduce((sum, item) => sum + (item.menuItem?.price || 0) * item.quantity, 0);

    const newOrder: Order = {
        id: orderRef.id,
        orderNumber: `ORD-${orderRef.id.slice(0, 6).toUpperCase()}`,
        status: 'open',
        type: 'dine-in',
        totalAmount: subtotal,
        finalAmount: subtotal,
        user: { id: userProfile.id, username: userProfile.username || userProfile.email },
        table: { id: selectedTable.id, tableNumber: selectedTable.number },
        tenant: { id: selectedTenantId, name: activeMenu.tenant.name },
        branch: { id: branchId, name: branchName },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };
    batch.set(orderRef, newOrder);

    for (const item of orderItems) {
        const orderItemRef = doc(collection(db, "branches", branchId, "orders", orderRef.id, "items"));
        
        const firestoreOrderItem: Omit<NewOrderItemType, 'id'> & { note?: string } = {
            menuItem: item.menuItem,
            quantity: item.quantity,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        if (item.note) {
            firestoreOrderItem.note = item.note;
        }
        
        batch.set(orderItemRef, firestoreOrderItem);
    }

    const tableRef = doc(db, "branches", branchId, "tables", selectedTable.id);
    batch.update(tableRef, {
        status: 'occupied',
        currentOrder: { id: orderRef.id, orderNumber: newOrder.orderNumber },
        updatedAt: Timestamp.now()
    });

    try {
        await batch.commit();
        toast({
            title: "Order Saved!",
            description: `Order ${newOrder.orderNumber} has been saved to Table ${selectedTable.number}.`,
        });
        setOrderItems([]);
        router.push('/dashboard/tables');
    } catch (error) {
        console.error("Error saving order:", error);
        toast({ title: "Save Failed", description: "Could not save the order to the table.", variant: "destructive" });
    } finally {
        setIsSavingOrder(false);
    }
  };

  const handleCheckout = (paymentMethod: string) => {
    // This function will need to be adapted for editing orders too
    if (orderItems.length === 0) {
      toast({ title: "Empty Order", description: "Cannot checkout an empty order.", variant: "destructive" });
      return;
    }
    
    let checkoutMessage = `Paid with ${paymentMethod}.`;
    if (selectedTable) {
        checkoutMessage += ` Order for Table ${selectedTable.number}.`;
    }

    const orderTotalWithTax = orderItems.reduce((sum, item) => sum + (item.menuItem?.price || 0) * item.quantity, 0) * 1.08; 
    toast({ 
        title: "Checkout Successful!", 
        description: `${checkoutMessage} Total: $${orderTotalWithTax.toFixed(2)}`
    });
    setOrderItems([]);
    if (editingOrderId) {
        router.push('/dashboard/tables');
    }
  };

  const categories = Array.from(new Set(menuItems.map(item => item.category))).sort();
  
  const filteredMenuItems = menuItems.filter(item => 
    item.available && 
    (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">{editingOrderId ? "Loading order for editing..." : "Loading menu..."}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-full">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!activeMenu || menuItems.length === 0) {
     return (
      <div className="flex flex-col justify-center items-center h-full">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">No menu items available for the selected tenant.</p>
         {!selectedTenantId && <p className="text-sm text-muted-foreground mt-2">Please ensure a tenant is selected.</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-theme(spacing.24))]">
      <div className="lg:w-3/4 flex flex-col">
        {editingOrderId && (
            <div className="p-3 mb-4 bg-accent text-accent-foreground rounded-lg shadow text-center font-semibold">
                Editing Order for Table {selectedTable?.number || '...'}
            </div>
        )}
        {selectedTable && !editingOrderId && (
            <div className="p-3 mb-4 bg-accent text-accent-foreground rounded-lg shadow text-center font-semibold">
                Creating Order for Table {selectedTable.number}
            </div>
        )}
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
             {categories.length === 0 && <TabsTrigger value="all" disabled>All</TabsTrigger>}
          </TabsList>
          
          <div className="flex-grow overflow-auto pr-2">
            {categories.map(category => (
              <TabsContent key={category} value={category} className="mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMenuItems.filter(item => item.category === category).map((item) => {
                    const orderItemInstance = orderItems.find(oi => oi.menuItem?.id === item.id);
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
             <TabsContent value="all"> 
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMenuItems.map((item) => {
                     const orderItemInstance = orderItems.find(oi => oi.menuItem?.id === item.id);
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
          onSaveOrder={handleSaveOrUpdateOrder}
          isSavingOrder={isSavingOrder}
          selectedTable={selectedTable}
          isEditing={!!editingOrderId}
        />
      </div>
    </div>
  );
}
