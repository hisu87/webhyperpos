
// To run this seed script:
// 1. Ensure you have tsx installed (npm install -g tsx) or use ts-node.
// 2. Set up your Firebase client config in .env file (NEXT_PUBLIC_FIREBASE_...).
// 3. Run from the root of your project: `tsx src/lib/seed.ts`

import { config as dotenvConfig } from 'dotenv';
import path from 'path'; // Import the 'path' module

// Explicitly load .env file from the project root
const envPath = path.resolve(process.cwd(), '.env');
console.log("Attempting to load environment variables from:", envPath);
const dotenvResult = dotenvConfig({ path: envPath });

if (dotenvResult.error) {
  console.error("ERROR loading .env file:", dotenvResult.error);
  process.exit(1);
} else {
  if (dotenvResult.parsed) {
    console.log(".env file loaded successfully. Variables found:", Object.keys(dotenvResult.parsed).join(', '));
  } else {
    console.warn(".env file was processed, but no variables were parsed. Is the file empty or formatted incorrectly?");
  }
}

// ---- DEBUGGING: Print the critical environment variables ----
const apiKeyFromEnv = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const projectIdFromEnv = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

console.log("DEBUG: NEXT_PUBLIC_FIREBASE_API_KEY as read by script:", apiKeyFromEnv ? `'${apiKeyFromEnv}' (length: ${apiKeyFromEnv.length})` : "NOT FOUND or EMPTY");
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_PROJECT_ID as read by script:", projectIdFromEnv ? `'${projectIdFromEnv}'` : "NOT FOUND or EMPTY");

if (!apiKeyFromEnv || !projectIdFromEnv) {
    console.error("CRITICAL ERROR: API Key or Project ID is missing after attempting to load .env. Halting script.");
    console.error("Please ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set in your .env file at the project root.");
    process.exit(1);
}
// ---- END DEBUGGING ----

import { initializeFirebaseClient, db as getDb } from './firebase';
import { collection, doc, setDoc, writeBatch, Timestamp, where, query, getDocs, deleteDoc, limit } from 'firebase/firestore'; // Added limit
import type {
    Tenant, Branch, User, Menu, MenuItem, CafeTable, Promotion, CustomerLoyalty,
    Order, OrderItem, QRPaymentRequest, Ingredient, BranchInventoryItem, MenuItemRecipeItem,
    StockMovement, ShiftReport, Notification, DenormalizedTenantRef, DenormalizedBranchRef,
    DenormalizedUserRef, DenormalizedMenuRef, DenormalizedMenuItemRef, DenormalizedTableRef, DenormalizedIngredientRef
} from './types';

async function clearExistingData(firestoreDb: any, collectionPath: string) {
    console.log(`Clearing existing data from ${collectionPath}...`);
    const q = query(collection(firestoreDb, collectionPath));
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(firestoreDb);
    querySnapshot.forEach((docSnapshot) => {
        batch.delete(docSnapshot.ref);
    });
    await batch.commit();
    console.log(`Finished clearing data from ${collectionPath}. Deleted ${querySnapshot.size} documents.`);
}


const tenantsData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'The Cozy Bean Corp.', subscriptionPlan: 'pro' },
    { name: 'Urban Grind Inc.', subscriptionPlan: 'basic' },
    { name: 'Aroma Mocha Group', subscriptionPlan: 'enterprise' },
];

const ingredientsSeedData: Omit<Ingredient, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'Coffee Beans - Arabica', unit: 'gram', lowStockThreshold: 1000, category: 'Coffee Supplies', description: 'High quality Arabica beans' },
    { name: 'Coffee Beans - Robusta', unit: 'gram', lowStockThreshold: 1000, category: 'Coffee Supplies', description: 'Strong Robusta beans' },
    { name: 'Full Cream Milk', unit: 'ml', lowStockThreshold: 5000, category: 'Dairy', description: 'Fresh full cream milk' },
    { name: 'Oat Milk', unit: 'ml', lowStockThreshold: 2000, category: 'Dairy Alternative', description: 'Organic oat milk' },
    { name: 'Sugar Syrup', unit: 'ml', lowStockThreshold: 1000, category: 'Sweeteners', description: 'Standard sugar syrup' },
    { name: 'Vanilla Syrup', unit: 'ml', lowStockThreshold: 500, category: 'Flavoring', description: 'Premium vanilla syrup' },
    { name: 'Croissant Dough', unit: 'piece', lowStockThreshold: 20, category: 'Bakery', description: 'Frozen croissant dough' },
    { name: 'Blueberries', unit: 'gram', lowStockThreshold: 500, category: 'Fruit', description: 'Fresh blueberries for muffins' },
    { name: 'Chocolate Chips', unit: 'gram', lowStockThreshold: 300, category: 'Baking', description: 'Dark chocolate chips' },
    { name: 'Tea Leaves - Black', unit: 'gram', lowStockThreshold: 200, category: 'Tea Supplies', description: 'Premium black tea leaves' },
];

const serverAdminData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'tenant' | 'branch'> = {
    firebaseUid: `server-admin-fbuid-${Date.now()}`,
    email: 'serveradmin@example.com',
    username: 'Server Admin',
    role: 'admin',
    active: true,
    hashedPinCode: 'adminpin123' // In a real app, hash this securely
};


async function seedDatabase() {
    console.log('Starting database seed...');
    const firestoreDb = getDb();
    if (!firestoreDb) {
      console.error("Lỗi: Firebase Firestore instance (db) chưa được khởi tạo. Hãy kiểm tra initializeFirebaseClient().");
      process.exit(1);
    }

    // Clear existing data (optional, use with caution)
    // Add collections you want to clear before seeding
    const collectionsToClear = [
        'users', 'branches', 'menus', 'promotions', 'tenants',
        'customerLoyalty', 'ingredients', 'notifications',
        // For subcollections, you'd need to iterate through parent docs first to clear them,
        // or ensure parent docs are cleared (which cascades to subcollections in a way)
    ];
    // for (const coll of collectionsToClear) {
    //    await clearExistingData(firestoreDb, coll);
    // }
    // Note: Clearing subcollections like 'items' in 'menus' or 'tables' in 'branches' requires more complex logic
    // if you want to keep parent documents. This example implies that if parent collections like 'branches' or 'menus'
    // are cleared, their subcollections effectively go away too.

    const batch = writeBatch(firestoreDb);

    try {
        // 1. Create Server Admin
        const serverAdminRef = doc(collection(firestoreDb, 'users'));
        const serverAdminFullData: User = {
            id: serverAdminRef.id,
            ...serverAdminData,
            // NO tenant, NO branch for server admin explicitly set here.
            // Their access is determined by role='admin' in application logic.
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        batch.set(serverAdminRef, serverAdminFullData);
        console.log(`Prepared server admin: ${serverAdminFullData.email}`);

        // 2. Create Tenants
        const tenantDocs: { id: string, data: Tenant }[] = [];
        for (const tenant of tenantsData) {
            const tenantRef = doc(collection(firestoreDb, 'tenants'));
            const tenantFullData: Tenant = {
                id: tenantRef.id, ...tenant,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            batch.set(tenantRef, tenantFullData);
            tenantDocs.push({ id: tenantRef.id, data: tenantFullData });
            console.log(`Prepared tenant: ${tenant.name}`);
        }

        // 3. Create Ingredients (linked to the first tenant for this seed)
        const ingredientDocs: { id: string, data: Ingredient, denormalized: DenormalizedIngredientRef }[] = [];
        const firstTenantForIngredients = tenantDocs[0]; // Assuming at least one tenant exists
        if (firstTenantForIngredients) {
            for (const ingData of ingredientsSeedData) {
                const ingredientRef = doc(collection(firestoreDb, 'ingredients'));
                   const ingredientFullData: Ingredient = {
                     id: ingredientRef.id,
                     ...ingData,
                     tenantId: firstTenantForIngredients.id, // Link to the first tenant
                     createdAt: Timestamp.now(),
                     updatedAt: Timestamp.now()
                   };
                   batch.set(ingredientRef, ingredientFullData);
                   ingredientDocs.push({
                       id: ingredientRef.id,
                       data: ingredientFullData,
                       denormalized: { id: ingredientRef.id, name: ingredientFullData.name, unit: ingredientFullData.unit }
                    });
                   console.log(`Prepared ingredient: ${ingData.name} for tenant ${firstTenantForIngredients.data.name}`);
            }
        }


        // 4. For each Tenant, create related entities
        for (const tenantDoc of tenantDocs) {
            const currentTenantRef: DenormalizedTenantRef = { id: tenantDoc.id, name: tenantDoc.data.name };

            // 4a. Create Branches for the current Tenant
            const branchSeedData = [
                { name: `${tenantDoc.data.name} - Main St`, location: '123 Main St, Anytown' },
                { name: `${tenantDoc.data.name} - Downtown`, location: '456 Central Ave, Anytown' },
            ];
            const branchDocs: { id: string, data: Branch, denormalized: DenormalizedBranchRef }[] = [];
            for (const branchData of branchSeedData) {
                const branchRef = doc(collection(firestoreDb, 'branches'));
                const branchFullData: Branch = {
                    id: branchRef.id,
                    ...branchData,
                    tenant: currentTenantRef,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                };
                batch.set(branchRef, branchFullData);
                branchDocs.push({ id: branchRef.id, data: branchFullData, denormalized: { id: branchRef.id, name: branchFullData.name } });
                console.log(`Prepared branch: ${branchData.name} for tenant ${tenantDoc.data.name}`);
            }

            // 4b. Create Users (manager, cashier) for each Branch
            for (const branchDoc of branchDocs) {
                const usersForBranch = [
                    { email: `manager-${tenantDoc.id.slice(0,3)}-${branchDoc.id.slice(0,3)}@example.com`, username: `Manager ${branchDoc.data.name.split(" ")[0]}`, role: 'manager', active: true, hashedPinCode: 'mgrpin123' },
                    { email: `cashier1-${tenantDoc.id.slice(0,3)}-${branchDoc.id.slice(0,3)}@example.com`, username: `Cashier1 ${branchDoc.data.name.split(" ")[0]}`, role: 'cashier', active: true, hashedPinCode: 'cshpin123' },
                    { email: `cashier2-${tenantDoc.id.slice(0,3)}-${branchDoc.id.slice(0,3)}@example.com`, username: `Cashier2 ${branchDoc.data.name.split(" ")[0]}`, role: 'cashier', active: true, hashedPinCode: 'cshpin456' },
                ];
                for (const userData of usersForBranch) {
                    const userRef = doc(collection(firestoreDb, 'users'));
                    const userFullData: User = {
                        id: userRef.id,
                        firebaseUid: `seed-fbuid-${userRef.id}`, // Placeholder, real apps would get this from Auth
                        ...userData,
                        tenant: currentTenantRef,
                        branch: branchDoc.denormalized,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    };
                    batch.set(userRef, userFullData);
                    console.log(`Prepared user: ${userData.username} for branch ${branchDoc.data.name}`);
                }

                // 4c. Create CafeTables for each Branch
                const tablesForBranch: Omit<CafeTable, 'id' | 'branch' | 'createdAt' | 'updatedAt'>[] = [
                    { tableNumber: 'A1', zone: 'Indoors', status: 'available', capacity: 2, isActive: true },
                    { tableNumber: 'A2', zone: 'Indoors', status: 'occupied', currentOrder: { id: `dummy-order-${branchDoc.id}-A2`, orderNumber: `ORD-${branchDoc.id.slice(0,3)}-A2` }, capacity: 4, isActive: true },
                    { tableNumber: 'B1', zone: 'Patio', status: 'reserved', capacity: 4, isActive: true, reservationDetails: { guestName: 'Jane Doe', guestPhone: '555-5678', reservationTime: Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)), notes: 'Celebrating an anniversary.' } },
                    { tableNumber: 'B2', zone: 'Patio', status: 'cleaning', capacity: 2, isActive: true },
                    { tableNumber: 'C1', zone: 'Bar', status: 'available', capacity: 1, isActive: false }, // Inactive table
                ];
                for (const tableData of tablesForBranch) {
                    const tableRef = doc(collection(firestoreDb, 'branches', branchDoc.id, 'tables'));
                    const tableFullData: CafeTable = {
                        id: tableRef.id,
                        branch: branchDoc.denormalized,
                        ...tableData,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    };
                    batch.set(tableRef, tableFullData);
                    console.log(`Prepared table: ${tableData.tableNumber} for branch ${branchDoc.data.name}`);
                }

                // 4d. Create BranchInventoryItems for each Branch (using ingredients from firstTenant)
                for(const ingDoc of ingredientDocs) { // Ensure ingredientDocs is populated from step 3
                    const inventoryRef = doc(firestoreDb, 'branches', branchDoc.id, 'inventory', ingDoc.id); // Doc ID is ingredient ID
                    const invData: BranchInventoryItem = {
                        id: ingDoc.id, // Ensure this matches the document ID for this subcollection
                        branch: branchDoc.denormalized,
                        ingredient: ingDoc.denormalized,
                        currentQuantity: Math.floor(Math.random() * ((ingDoc.data.lowStockThreshold || 50) * 3)) + (ingDoc.data.lowStockThreshold || 50),
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    };
                    batch.set(inventoryRef, invData);
                    console.log(`Prepared inventory for ${ingDoc.data.name} at branch ${branchDoc.data.name}`);
                }
                 // 4e. Create ShiftReports for each Branch
                const shiftReportRef = doc(collection(firestoreDb, 'branches', branchDoc.id, 'shiftReports'));
                // Attempt to find a cashier user for this branch to assign to the report
                const cashierUserQuery = query(
                    collection(firestoreDb, 'users'),
                    where('branch.id', '==', branchDoc.id),
                    where('role', '==', 'cashier'),
                    limit(1)
                );
                const cashierUserForReportSnapshot = await getDocs(cashierUserQuery);
                const cashierUserDoc = cashierUserForReportSnapshot.docs[0];
                const denormalizedCashierUser: DenormalizedUserRef | undefined = cashierUserDoc
                    ? {id: cashierUserDoc.id, username: cashierUserDoc.data().username}
                    : undefined;

                if (denormalizedCashierUser) {
                    const shiftReportData: ShiftReport = {
                        id: shiftReportRef.id,
                        user: denormalizedCashierUser,
                        startTime: Timestamp.fromDate(new Date(Date.now() - 8 * 60 * 60 * 1000)), // 8 hours ago
                        endTime: Timestamp.now(), // Closed now
                        status: 'closed',
                        finalRevenue: Math.random() * 500 + 200, // Random revenue
                        totalCashIn: Math.random() * 200 + 50,
                        totalCardIn: Math.random() * 300 + 100,
                        totalQrIn: Math.random() * 50 + 10,
                        totalTransactions: Math.floor(Math.random() * 50) + 10,
                        notes: 'Productive shift. All systems nominal.',
                        branch: branchDoc.denormalized,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    };
                    batch.set(shiftReportRef, shiftReportData);
                    console.log(`Prepared shift report for branch ${branchDoc.data.name}`);
                } else {
                    console.warn(`Could not find a cashier to assign to shift report for branch ${branchDoc.data.name}. Skipping report.`);
                }
            }


            // 4f. Create Menu for the current Tenant
            const menuData: Omit<Menu, 'id' | 'createdAt' | 'updatedAt' | 'tenant' > = {
                name: `${tenantDoc.data.name} Main Menu`, isActive: true, description: 'Our signature offerings and daily specials.', version: '1.0.0'
            };
            const menuRef = doc(collection(firestoreDb, 'menus'));
            const menuFullData : Menu = {
                id: menuRef.id, ...menuData, tenant: currentTenantRef,
                createdAt: Timestamp.now(), updatedAt: Timestamp.now()
            }
            batch.set(menuRef, menuFullData);
            console.log(`Prepared menu: ${menuData.name} for tenant ${tenantDoc.data.name}`);

            const denormalizedMenuRef: DenormalizedMenuRef = { id: menuRef.id, name: menuFullData.name };

            // 4g. Create MenuItems for the Menu
            const menuItemsSeedData: Omit<MenuItem, 'id' | 'menu' | 'createdAt' | 'updatedAt'>[] = [
                { name: 'Espresso', category: 'Coffee', price: 2.75, unit: 'cup', available: true, imageUrl: 'https://placehold.co/100x100/A0522D/FFFFFF?text=Espresso', tags: ['hot', 'strong', 'classic'], dataAiHint: 'espresso shot' },
                { name: 'Latte', category: 'Coffee', price: 3.50, unit: 'cup', available: true, imageUrl: 'https://placehold.co/100x100/D2B48C/000000?text=Latte', tags: ['hot', 'milk', 'smooth'], dataAiHint: 'latte art' },
                { name: 'Cappuccino', category: 'Coffee', price: 3.60, unit: 'cup', available: false, imageUrl: 'https://placehold.co/100x100/8B4513/FFFFFF?text=Cappuccino', tags: ['hot', 'milk', 'foam', 'popular'], dataAiHint: 'cappuccino foam' },
                { name: 'Plain Croissant', category: 'Pastries', price: 2.20, unit: 'piece', available: true, imageUrl: 'https://placehold.co/100x100/F5DEB3/000000?text=Croissant', tags: ['baked', 'pastry', 'butter'], dataAiHint: 'croissant pastry' },
                { name: 'Blueberry Muffin', category: 'Pastries', price: 2.50, unit: 'piece', available: true, imageUrl: 'https://placehold.co/100x100/ADD8E6/000000?text=Muffin', tags: ['baked', 'fruit', 'sweet', 'moist'], dataAiHint: 'blueberry muffin' },
                { name: 'Iced Black Tea', category: 'Tea', price: 3.00, unit: 'glass', available: true, imageUrl: 'https://placehold.co/100x100/36454F/FFFFFF?text=Iced+Tea', tags: ['cold', 'refreshing', 'tea'], dataAiHint: 'iced tea glass' },
            ];
            const menuItemDocs: {id: string, data: MenuItem, denormalized: DenormalizedMenuItemRef}[] = [];
            for (const itemData of menuItemsSeedData) {
                const itemRef = doc(collection(firestoreDb, 'menus', menuRef.id, 'items'));
                const itemFullData: MenuItem = {
                  id: itemRef.id,
                  menu: denormalizedMenuRef,
                  ...itemData,
                  createdAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                };
                batch.set(itemRef, itemFullData);
                menuItemDocs.push({id: itemRef.id, data: itemFullData, denormalized: {id: itemRef.id, name: itemFullData.name, price: itemFullData.price, unit: itemFullData.unit }});
                console.log(`Prepared menu item: ${itemData.name} for menu ${menuData.name}`);

                // 4h. Create MenuItemRecipeItems
                if (itemData.name === 'Espresso' && ingredientDocs.find(i => i.data.name === 'Coffee Beans - Arabica')) {
                    const coffeeIngredientDoc = ingredientDocs.find(i => i.data.name === 'Coffee Beans - Arabica')!;
                    const recipeIngredientRef = doc(firestoreDb, 'menus', menuRef.id, 'items', itemRef.id, 'recipes', coffeeIngredientDoc.id); // Doc ID is ingredient ID
                    const recipeItemData: MenuItemRecipeItem = {
                        id: coffeeIngredientDoc.id, // This is the ingredientId
                        menuItem: { id: itemRef.id, name: itemData.name, price: itemData.price, unit: itemData.unit }, // Denormalized ref to MenuItem
                        ingredient: coffeeIngredientDoc.denormalized, // Denormalized ref to Ingredient
                        quantityNeeded: 18, // grams of coffee for espresso
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    };
                    batch.set(recipeIngredientRef, recipeItemData);
                    console.log(`Prepared recipe for Espresso (using ${coffeeIngredientDoc.data.name})`);
                }
                 if (itemData.name === 'Latte' && ingredientDocs.find(i => i.data.name === 'Coffee Beans - Arabica') && ingredientDocs.find(i => i.data.name === 'Full Cream Milk')) {
                    const coffeeIng = ingredientDocs.find(i => i.data.name === 'Coffee Beans - Arabica')!;
                    const milkIng = ingredientDocs.find(i => i.data.name === 'Full Cream Milk')!;

                    const recipeCoffeeRef = doc(firestoreDb, 'menus', menuRef.id, 'items', itemRef.id, 'recipes', coffeeIng.id);
                    batch.set(recipeCoffeeRef, {
                        id: coffeeIng.id, menuItem: { id: itemRef.id, name: itemData.name, price: itemData.price, unit: itemData.unit }, ingredient: coffeeIng.denormalized, quantityNeeded: 18, createdAt: Timestamp.now(), updatedAt: Timestamp.now()
                    } as MenuItemRecipeItem);

                    const recipeMilkRef = doc(firestoreDb, 'menus', menuRef.id, 'items', itemRef.id, 'recipes', milkIng.id);
                     batch.set(recipeMilkRef, {
                        id: milkIng.id, menuItem: { id: itemRef.id, name: itemData.name, price: itemData.price, unit: itemData.unit }, ingredient: milkIng.denormalized, quantityNeeded: 150, createdAt: Timestamp.now(), updatedAt: Timestamp.now()
                    } as MenuItemRecipeItem);
                    console.log(`Prepared recipe for Latte (coffee & milk)`);
                }
            }


            // 4i. Create Promotions for the current Tenant
            const promotionsData: Omit<Promotion, 'id'|'tenant'|'createdAt'|'updatedAt'>[] = [
                { name: `${tenantDoc.data.name} Grand Opening 10% Off`, code: `OPEN${tenantDoc.id.slice(0,3).toUpperCase()}10`, type: 'percentage', value: 10, minOrderValue: 5, startDate: Timestamp.fromDate(new Date()), endDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), isActive: true, appliesTo: 'all_orders' },
                { name: `${tenantDoc.data.name} Summer Special $2 Off`, code: `SUMMER${tenantDoc.id.slice(0,3).toUpperCase()}2`, type: 'fixed_amount', value: 2, minOrderValue: 10, startDate: Timestamp.fromDate(new Date()), endDate: Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)), isActive: true, appliesTo: 'specific_items' }, // Example: could link to specific item IDs
            ];
            for (const promoData of promotionsData) {
                const promoRef = doc(collection(firestoreDb, 'promotions'));
                const promoFullData: Promotion = {
                    id: promoRef.id, ...promoData, tenant: currentTenantRef,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                };
                batch.set(promoRef, promoFullData);
                console.log(`Prepared promotion: ${promoData.name} for tenant ${tenantDoc.data.name}`);
            }

            // 4j. Create CustomerLoyalty for the current Tenant
            const customersData: Omit<CustomerLoyalty, 'id'|'tenant'|'createdAt'|'updatedAt'>[] = [
                { name: `Loyal Customer One (${tenantDoc.id.slice(0,3)})`, phoneNumber: `555-0101-${tenantDoc.id.slice(0,2)}`, email: `loyal1-${tenantDoc.id.slice(0,3)}@example.com`, totalPoints: 150 },
                { name: `Frequent Drinker Two (${tenantDoc.id.slice(0,3)})`, phoneNumber: `555-0102-${tenantDoc.id.slice(0,2)}`, email: `loyal2-${tenantDoc.id.slice(0,3)}@example.com`, totalPoints: 275 },
            ];
            for (const custData of customersData) {
                const custRef = doc(collection(firestoreDb, 'customerLoyalty'));
                const custFullData: CustomerLoyalty = {
                    id: custRef.id, ...custData, tenant: currentTenantRef,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                };
                batch.set(custRef, custFullData);
                console.log(`Prepared customer: ${custData.name} for tenant ${tenantDoc.data.name}`);
            }

            // 4k. Create Orders with OrderItems & QRPaymentRequests for a branch
            if (branchDocs.length > 0 && menuItemDocs.length > 1) {
                const sampleBranch = branchDocs[0]; // Use first branch of current tenant
                // Find a sample user and table from the current branch
                const orderUserQuery = query(collection(firestoreDb, 'users'), where('branch.id', '==', sampleBranch.id), where('role', '==', 'cashier'), limit(1));
                const orderUserSnapshot = await getDocs(orderUserQuery);
                const sampleUserDoc = orderUserSnapshot.docs[0];
                const sampleUserRef: DenormalizedUserRef | undefined = sampleUserDoc ? { id: sampleUserDoc.id, username: sampleUserDoc.data().username } : undefined;

                const orderTableQuery = query(collection(firestoreDb, 'branches', sampleBranch.id, 'tables'), where('status', '==', 'available'), limit(1));
                const orderTableSnapshot = await getDocs(orderTableQuery);
                const sampleTableDoc = orderTableSnapshot.docs[0];
                const sampleTableRef: DenormalizedTableRef | undefined = sampleTableDoc ? {id: sampleTableDoc.id, tableNumber: sampleTableDoc.data().tableNumber} : undefined;


                if (sampleUserRef && sampleTableRef) {
                    const orderRef = doc(collection(firestoreDb, 'branches', sampleBranch.id, 'orders'));
                    const orderData: Order = {
                        id: orderRef.id,
                        orderNumber: `ORD-${sampleBranch.id.slice(0,3)}-${orderRef.id.slice(0,4).toUpperCase()}`,
                        status: 'pending',
                        type: 'dine-in',
                        totalAmount: 0, // Will be calculated based on items
                        finalAmount: 0, // Will be calculated
                        user: sampleUserRef,
                        table: sampleTableRef,
                        tenant: currentTenantRef,
                        branch: sampleBranch.denormalized,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    };

                    const orderItem1Ref = doc(collection(firestoreDb, 'branches', sampleBranch.id, 'orders', orderRef.id, 'items'));
                    const orderItem1Data: OrderItem = {
                        id: orderItem1Ref.id,
                        menuItem: menuItemDocs[0].denormalized, // Espresso
                        quantity: 2,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    };
                    batch.set(orderItem1Ref, orderItem1Data);
                    orderData.totalAmount += (menuItemDocs[0].denormalized.price * 2);

                    const orderItem2Ref = doc(collection(firestoreDb, 'branches', sampleBranch.id, 'orders', orderRef.id, 'items'));
                     const orderItem2Data: OrderItem = {
                        id: orderItem2Ref.id,
                        menuItem: menuItemDocs[3].denormalized, // Croissant
                        quantity: 1,
                        note: 'Extra crispy, please.',
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    };
                    batch.set(orderItem2Ref, orderItem2Data);
                    orderData.totalAmount += (menuItemDocs[3].denormalized.price * 1);
                    orderData.finalAmount = orderData.totalAmount; // Assuming no tax/discount for seed simplicity

                    batch.set(orderRef, orderData); // Set the order data after items are processed for totalAmount
                    console.log(`Prepared order ${orderData.orderNumber} with items for branch ${sampleBranch.data.name}`);

                    // Create QRPaymentRequest for this order
                    const qrPaymentRef = doc(collection(firestoreDb, 'branches', sampleBranch.id, 'orders', orderRef.id, 'qrPaymentRequests'));
                    const qrPaymentData: QRPaymentRequest = {
                        id: qrPaymentRef.id,
                        order: { id: orderRef.id, orderNumber: orderData.orderNumber },
                        amount: orderData.finalAmount,
                        status: 'pending',
                        qrContent: `PAYMENT_QR_CODE_FOR_ORDER_${orderRef.id}_AMOUNT_${orderData.finalAmount}`,
                        expiresAt: Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)), // Expires in 15 mins
                        branch: sampleBranch.denormalized,
                        tenant: currentTenantRef,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    };
                    batch.set(qrPaymentRef, qrPaymentData);
                    console.log(`Prepared QR payment request for order ${orderData.orderNumber}`);

                    // Create StockMovements for the items sold in this order (example for Espresso)
                    const espressoRecipeItem = menuItemDocs[0].data.name === 'Espresso' ? 
                        (await getDocs(collection(firestoreDb, 'menus', denormalizedMenuRef.id, 'items', menuItemDocs[0].id, 'recipes'))).docs
                        .map(d => d.data() as MenuItemRecipeItem)
                        .find(r => r.ingredient.name === 'Coffee Beans - Arabica') : undefined;

                    if (espressoRecipeItem) {
                        const stockMovementEspressoRef = doc(collection(firestoreDb, 'branches', sampleBranch.id, 'stockMovements'));
                        const stockMovementEspresso: StockMovement = {
                            id: stockMovementEspressoRef.id,
                            ingredient: espressoRecipeItem.ingredient, // Use the denormalized ingredient from recipe
                            quantity: - (espressoRecipeItem.quantityNeeded * orderItem1Data.quantity), // quantityNeeded * items ordered
                            type: 'sale_out',
                            source: `Order ${orderData.orderNumber}`,
                            user: sampleUserRef,
                            branch: sampleBranch.denormalized,
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now(),
                        };
                        batch.set(stockMovementEspressoRef, stockMovementEspresso);
                        console.log(`Prepared stock movement for Espresso sale (deducted ${espressoRecipeItem.ingredient.name})`);
                    }
                } else {
                    console.warn(`Could not find sample user or table for branch ${sampleBranch.data.name}. Skipping order creation.`);
                }
            }
        }

        // 5. Create Notifications (some general, some specific)
        const notification1Ref = doc(collection(firestoreDb, 'notifications'));
        const notification1: Notification = {
            id: notification1Ref.id,
            type: 'system_update',
            message: 'CoffeeOS has been updated to version 1.2. Enjoy new features and improvements!',
            status: 'unread',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            // No tenant/branch/user means it's a global notification for all admins or system-wide display
        };
        batch.set(notification1Ref, notification1);
        console.log(`Prepared global notification: ${notification1.message}`);

        if (tenantDocs.length > 0 && ingredientDocs.length > 0) {
            // Find an ingredient that might be low stock, e.g., Vanilla Syrup
            const lowStockIng = ingredientDocs.find(ing => ing.data.name === 'Vanilla Syrup');
            if (lowStockIng) {
                const notification2Ref = doc(collection(firestoreDb, 'notifications'));
                const notification2: Notification = {
                    id: notification2Ref.id,
                    type: 'low_stock_warning',
                    message: `Ingredient '${lowStockIng.data.name}' is running low. Current quantity estimate is below threshold. Please check branch inventories.`,
                    status: 'unread',
                    tenant: {id: lowStockIng.data.tenantId, name: tenantDocs.find(t=>t.id === lowStockIng.data.tenantId)?.data.name || 'Unknown Tenant'},
                    // Could also target specific branch or users if needed for more granular alerts
                    relatedEntity: { type: 'ingredient', id: lowStockIng.id },
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                };
                batch.set(notification2Ref, notification2);
                console.log(`Prepared low stock warning notification for ${lowStockIng.data.name}`);
            }
        }


        await batch.commit();
        console.log('Database seeded successfully!');

    } catch (error) {
        console.error('Error seeding database:', error);
    }
}

// Ensure Firebase is initialized AFTER .env is loaded and BEFORE seedDatabase is called
if (require.main === module) {
    // Critical environment variable checks are already done above.
    // If they pass, proceed to initialize Firebase.
    initializeFirebaseClient(); // Initialize Firebase services

    seedDatabase().catch(err => {
        console.error("Unhandled error in seedDatabase:", err);
        process.exit(1);
    });
}

