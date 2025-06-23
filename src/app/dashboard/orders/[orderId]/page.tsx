
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, DocumentData, collection, writeBatch, Timestamp } from 'firebase/firestore';
import { initializeFirebaseClient, db as getDbInstance } from '@/lib/firebase';
import type { Order as OrderType, OrderItem as OrderItemType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, AlertTriangle, Edit } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function OrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.orderId as string;
    const [order, setOrder] = useState<OrderType | null>(null);
    const [items, setItems] = useState<OrderItemType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [firebaseInitialized, setFirebaseInitialized] = useState(false);
    const [branchId, setBranchId] = useState<string | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        try {
            initializeFirebaseClient();
            setFirebaseInitialized(true);
            setBranchId(localStorage.getItem('selectedBranchId'));
        } catch (e) {
            console.error("Error initializing Firebase:", e);
            setError("Failed to initialize core services.");
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!firebaseInitialized || !orderId || !branchId) {
            if (firebaseInitialized && !branchId) {
                setError("Branch context not found. Cannot fetch order.");
                setLoading(false);
            }
            return;
        }

        const db = getDbInstance();
        if (!db) {
            setError("Database service is not available.");
            setLoading(false);
            return;
        }
        
        const orderRef = doc(db, 'branches', branchId, 'orders', orderId);

        const unsubscribeOrder = onSnapshot(orderRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as DocumentData;
                setOrder({
                  id: docSnap.id,
                  ...data,
                  createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                  updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                } as OrderType);

                const itemsRef = collection(db, 'branches', branchId!, 'orders', orderId, 'items');
                const unsubscribeItems = onSnapshot(itemsRef, (itemsSnapshot) => {
                    const fetchedItems = itemsSnapshot.docs.map(itemDoc => ({
                        id: itemDoc.id,
                        ...itemDoc.data()
                    } as OrderItemType));
                    setItems(fetchedItems);
                    setLoading(false);
                }, (err) => {
                    console.error("Error fetching order items:", err);
                    setError("Failed to fetch order items.");
                    setLoading(false);
                });

                return () => unsubscribeItems();

            } else {
                setError("Order not found.");
                setLoading(false);
            }
        }, (err) => {
            console.error("Error fetching order:", err);
            setError("Failed to fetch order details.");
            setLoading(false);
        });

        return () => unsubscribeOrder();

    }, [firebaseInitialized, orderId, branchId]);

    const handleEditOrder = () => {
        if (!order || !order.table) return;
        router.push(`/dashboard/menu?orderId=${orderId}&tableId=${order.table.id}&tableNumber=${order.table.tableNumber}`);
    };

    const handleProceedToPayment = async () => {
        if (!order || !branchId) {
            toast({ title: "Error", description: "Order or branch context is missing.", variant: "destructive" });
            return;
        }

        setIsProcessingPayment(true);
        const db = getDbInstance();
        if (!db) {
            toast({ title: "Database Error", description: "Could not connect to the database.", variant: "destructive" });
            setIsProcessingPayment(false);
            return;
        }

        const batch = writeBatch(db);

        const orderRef = doc(db, 'branches', branchId, 'orders', orderId);
        batch.update(orderRef, {
            status: 'paid',
            paidAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        if (order.table?.id) {
            const tableRef = doc(db, 'branches', branchId, 'tables', order.table.id);
            batch.update(tableRef, {
                status: 'cleaning',
                currentOrder: null,
                updatedAt: Timestamp.now()
            });
        }
        
        try {
            await batch.commit();
            toast({
                title: "Payment Successful!",
                description: `Order #${order.orderNumber} has been paid. Table ${order.table?.tableNumber || ''} is now being cleaned.`,
            });
            router.push('/dashboard/tables');
        } catch (error) {
            console.error("Error processing payment:", error);
            toast({
                title: "Payment Failed",
                description: "An error occurred while finalizing the payment.",
                variant: "destructive"
            });
        } finally {
            setIsProcessingPayment(false);
        }
    };


    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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
    
    if (!order) {
         return <div className="text-center">Order details could not be loaded.</div>
    }

    const subtotal = items.reduce((sum, item) => sum + (item.menuItem?.price || 0) * item.quantity, 0);

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Order #{order.orderNumber}</CardTitle>
                    <CardDescription>
                        Status: <span className="font-bold capitalize">{order.status}</span> | 
                        Table: {order.table?.tableNumber || 'N/A'} | 
                        Cashier: {order.user.username}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-bold mb-2">Items</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Unit Price</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-medium">{item.menuItem?.name}</div>
                                            {item.note && <div className="text-xs text-muted-foreground">{item.note}</div>}
                                        </TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>${(item.menuItem?.price || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">${((item.menuItem?.price || 0) * item.quantity).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax (est.):</span>
                                <span>${(subtotal * 0.08).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total:</span>
                                <span>${(subtotal * 1.08).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                </CardContent>
                <CardFooter className="justify-end gap-2">
                    {order.status === 'open' && (
                        <>
                            <Button variant="outline" onClick={handleEditOrder}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Order
                            </Button>
                            <Button onClick={handleProceedToPayment} disabled={isProcessingPayment}>
                                {isProcessingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isProcessingPayment ? 'Processing...' : 'Proceed to Payment'}
                            </Button>
                        </>
                    )}
                    {order.status !== 'open' && (
                        <p className="text-sm text-muted-foreground">This order is {order.status} and cannot be modified.</p>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
