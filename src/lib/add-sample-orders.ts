// src/lib/add-sample-orders.ts

// To run this script:
// 1. Ensure you have tsx installed (npm install -g tsx) or use ts-node.
// 2. Make sure your database has been seeded with initial data (tenants, branches, users, menus, etc.) by running `seed.ts` first.
// 3. Set up your Firebase client config in .env file (NEXT_PUBLIC_FIREBASE_...).
// 4. Run from the root of your project: `tsx src/lib/add-sample-orders.ts`

import { config as dotenvConfig } from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenvConfig({ path: envPath });

import { initializeFirebaseClient, db as getDb } from './firebase';
import { 
    collection, doc, setDoc, writeBatch, Timestamp, where, query, getDocs, limit, updateDoc,
    type Firestore 
} from 'firebase/firestore';
import type {
    Tenant, Branch, User, Menu, MenuItem, CafeTable, Order, OrderItem,
    DenormalizedTenantRef, DenormalizedBranchRef, DenormalizedUserRef, DenormalizedMenuItemRef, DenormalizedTableRef
} from './types';


// --- Configuration ---
const NUM_ORDERS_TO_CREATE = 5; // How many sample orders to create
// --- End Configuration ---


/**
 * A helper function to get a random item from an array.
 * @param arr The array to pick from.
 * @returns A random item from the array.
 */
function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}


async function addSampleOrders() {
    console.log('Starting to add sample orders...');
    const firestoreDb = getDb();
    if (!firestoreDb) {
      console.error("ERROR: Firebase Firestore instance (db) is not initialized. Check initializeFirebaseClient().");
      process.exit(1);
    }
    
    try {
        // 1. Fetch necessary entities to build an order
        console.log("Fetching required data (tenant, branch, users, menu, tables)...");

        // Fetch the first tenant
        const tenantsQuery = query(collection(firestoreDb, 'tenants'), limit(1));
        const tenantsSnapshot = await getDocs(tenantsQuery);
        if (tenantsSnapshot.empty) {
            console.error("No tenants found in the database. Please run the main seed script first.");
            return;
        }
        const tenantDoc = tenantsSnapshot.docs[0];
        const tenant = { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;
        const denormalizedTenant: DenormalizedTenantRef = { id: tenant.id, name: tenant.name };
        console.log(`Using Tenant: ${tenant.name}`);

        // Fetch the first branch for this tenant
        const branchesQuery = query(collection(firestoreDb, 'branches'), where('tenant.id', '==', tenant.id), limit(1));
        const branchesSnapshot = await getDocs(branchesQuery);
        if (branchesSnapshot.empty) {
            console.error(`No branches found for tenant "${tenant.name}". Please run the main seed script first.`);
            return;
        }
        const branchDoc = branchesSnapshot.docs[0];
        const branch = { id: branchDoc.id, ...branchDoc.data() } as Branch;
        const denormalizedBranch: DenormalizedBranchRef = { id: branch.id, name: branch.name };
        console.log(`Using Branch: ${branch.name}`);
        
        // Fetch cashiers for this branch
        const cashiersQuery = query(collection(firestoreDb, 'users'), where('branch.id', '==', branch.id), where('role', '==', 'cashier'));
        const cashiersSnapshot = await getDocs(cashiersQuery);
        const cashiers = cashiersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        if (cashiers.length === 0) {
            console.error(`No cashiers found for branch "${branch.name}". Please run the main seed script first.`);
            return;
        }
        console.log(`Found ${cashiers.length} cashiers.`);

        // Fetch an active menu for this tenant
        const menuQuery = query(collection(firestoreDb, 'menus'), where('tenant.id', '==', tenant.id), where('isActive', '==', true), limit(1));
        const menuSnapshot = await getDocs(menuQuery);
        if (menuSnapshot.empty) {
            console.error(`No active menu found for tenant "${tenant.name}". Please run the main seed script first.`);
            return;
        }
        const menuDoc = menuSnapshot.docs[0];
        const menu = { id: menuDoc.id, ...menuDoc.data() } as Menu;
        console.log(`Using Menu: ${menu.name}`);
        
        // Fetch menu items from this menu
        const menuItemsQuery = query(collection(firestoreDb, 'menus', menu.id, 'items'));
        const menuItemsSnapshot = await getDocs(menuItemsQuery);
        const menuItems = menuItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
         if (menuItems.length === 0) {
            console.error(`No menu items found for menu "${menu.name}". Please run the main seed script first.`);
            return;
        }
        console.log(`Found ${menuItems.length} menu items.`);
        
        // Fetch available tables from this branch
        const tablesQuery = query(collection(firestoreDb, 'branches', branch.id, 'tables'), where('status', '==', 'available'));
        const tablesSnapshot = await getDocs(tablesQuery);
        let availableTables = tablesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CafeTable));
        if (availableTables.length === 0) {
            console.error(`No available tables found for branch "${branch.name}". Cannot create 'dine-in' orders. Try marking some tables as 'available'.`);
            return;
        }
        console.log(`Found ${availableTables.length} available tables.`);


        // 2. Create the specified number of orders
        let ordersCreatedCount = 0;
        for (let i = 0; i < NUM_ORDERS_TO_CREATE; i++) {
            if (availableTables.length === 0) {
                console.log("No more available tables. Stopping order creation.");
                break;
            }

            const batch = writeBatch(firestoreDb);

            // Select a table and remove it from the available pool for this run
            const tableToOccupy = availableTables.shift()!;
            const denormalizedTable: DenormalizedTableRef = { id: tableToOccupy.id, tableNumber: tableToOccupy.tableNumber };

            // Select a random cashier
            const cashier = getRandomItem(cashiers);
            const denormalizedUser: DenormalizedUserRef = { id: cashier.id, username: cashier.username || 'N/A' };
            
            // Create the main Order document
            const orderRef = doc(collection(firestoreDb, 'branches', branch.id, 'orders'));
            const order: Order = {
                id: orderRef.id,
                orderNumber: `SAMPLE-${orderRef.id.slice(0, 6).toUpperCase()}`,
                status: 'paid', // Or 'open', 'preparing', etc.
                type: 'dine-in',
                totalAmount: 0,
                finalAmount: 0,
                user: denormalizedUser,
                table: denormalizedTable,
                tenant: denormalizedTenant,
                branch: denormalizedBranch,
                createdAt: Timestamp.now(),
                paidAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            // Create OrderItems
            let totalAmount = 0;
            const numItemsInOrder = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
            for (let j = 0; j < numItemsInOrder; j++) {
                const menuItem = getRandomItem(menuItems);
                const quantity = Math.floor(Math.random() * 2) + 1; // 1 or 2 quantity
                
                const orderItemRef = doc(collection(firestoreDb, 'branches', branch.id, 'orders', orderRef.id, 'items'));
                const denormalizedMenuItem: DenormalizedMenuItemRef = { id: menuItem.id, name: menuItem.name, price: menuItem.price, unit: menuItem.unit };

                const orderItem: OrderItem = {
                    id: orderItemRef.id,
                    menuItem: denormalizedMenuItem,
                    quantity: quantity,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                };

                // Conditionally add a note to avoid 'undefined'
                if (Math.random() > 0.7) {
                    orderItem.note = 'Extra hot';
                }

                batch.set(orderItemRef, orderItem);
                totalAmount += menuItem.price * quantity;
            }

            // Update order totals
            order.totalAmount = totalAmount;
            order.finalAmount = totalAmount; // For simplicity, no tax/discount in this sample

            // Add the fully populated Order document to the batch
            batch.set(orderRef, order);
            
            // Update the table status
            const tableRef = doc(firestoreDb, 'branches', branch.id, 'tables', tableToOccupy.id);
            batch.update(tableRef, {
                status: 'occupied',
                currentOrder: { id: order.id, orderNumber: order.orderNumber }
            });
            
            await batch.commit();
            console.log(`Successfully created Order ${order.orderNumber} for Table ${tableToOccupy.tableNumber}.`);
            ordersCreatedCount++;
        }

        console.log(`\nFinished. Created ${ordersCreatedCount} new sample orders.`);

    } catch (error) {
        console.error('Error adding sample orders:', error);
    }
}


if (require.main === module) {
    initializeFirebaseClient();
    addSampleOrders().catch(err => {
        console.error("Unhandled error in addSampleOrders:", err);
        process.exit(1);
    });
}
