
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { initializeFirebaseClient, db as getDbInstance } from '@/lib/firebase';
import type { Order as OrderType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function OrderDetailsPage() {
    const params = useParams();
    const orderId = params.orderId as string;
    const [order, setOrder] = useState<OrderType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [firebaseInitialized, setFirebaseInitialized] = useState(false);
    const [branchId, setBranchId] = useState<string | null>(null);

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

        const unsubscribe = onSnapshot(orderRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as DocumentData;
                setOrder({
                  id: docSnap.id,
                  ...data,
                  createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                  updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                } as OrderType);
            } else {
                setError("Order not found.");
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching order:", err);
            setError("Failed to fetch order details.");
            setLoading(false);
        });

        return () => unsubscribe();

    }, [firebaseInitialized, orderId, branchId]);

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

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Order #{order.orderNumber}</CardTitle>
                    <CardDescription>Status: <span className="font-bold">{order.status}</span></CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Table: {order.table?.tableNumber || 'N/A'}</p>
                    <p>Total Amount: ${order.totalAmount.toFixed(2)}</p>
                    <p>Final Amount: ${order.finalAmount.toFixed(2)}</p>
                    <p>Cashier: {order.user.username}</p>
                    <p>Created At: {new Date(order.createdAt).toLocaleString()}</p>
                    <h3 className="font-bold mt-4">Items:</h3>
                    <p className="text-muted-foreground">(Item details would be fetched from a subcollection here)</p>
                </CardContent>
            </Card>
        </div>
    );
}
