
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
  // It's critical to stop if .env isn't loaded, as Firebase init will fail.
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

// IMPORT SAU KHI dotenvConfig ĐÃ CHẠY VÀ CÁC BIẾN MÔI TRƯỜNG ĐÃ CÓ
// initializeFirebaseClient must be called before accessing db(), auth(), app()
import { initializeFirebaseClient, db as getDb } from './firebase';
import { collection, doc, setDoc, writeBatch, Timestamp } from 'firebase/firestore';
import type {
    Tenant, Branch, User, Menu, MenuItem, CafeTable, Promotion, Customer,
    Order, OrderItem, QRPaymentRequest, Ingredient, BranchInventoryItem, MenuItemRecipeItem,
    StockMovement, ShiftReport, Notification
} from './types'; // Ensure this path is correct

const tenantsData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'The Cozy Bean Corp.', subscriptionPlan: 'pro' },
    { name: 'Urban Grind Inc.', subscriptionPlan: 'basic' },
    { name: 'Aroma Mocha Group', subscriptionPlan: 'enterprise' },
];
const ingredientsData: Omit<Ingredient, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'Coffee Beans - Arabica', unit: 'gram', lowStockThreshold: 1000, category: 'Coffee Supplies', description: 'High quality Arabica beans' },
    { name: 'Full Cream Milk', unit: 'ml', lowStockThreshold: 5000, category: 'Dairy', description: 'Fresh full cream milk' },
    { name: 'Sugar Syrup', unit: 'ml', lowStockThreshold: 1000, category: 'Sweeteners', description: 'Standard sugar syrup' },
    { name: 'Croissant Dough', unit: 'piece', lowStockThreshold: 20, category: 'Bakery', description: 'Frozen croissant dough' },
    { name: 'Blueberries', unit: 'gram', lowStockThreshold: 500, category: 'Fruit', description: 'Fresh blueberries for muffins' },
];

async function seedDatabase() {
    console.log('Starting database seed...');
    const firestoreDb = getDb(); // Get the Firestore instance after initialization
    if (!firestoreDb) {
      console.error("Lỗi: Firebase Firestore instance (db) chưa được khởi tạo. Hãy kiểm tra initializeFirebaseClient().");
      process.exit(1);
    }
    const batch = writeBatch(firestoreDb);

    try {
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

        const ingredientRefsByName: { [key: string]: string } = {};

        if (tenantDocs.length > 0) {
            const firstTenantId = tenantDocs[0].id;

            for (const ingData of ingredientsData) {
                const ingredientRef = doc(collection(firestoreDb, 'ingredients'));
                   const ingredientFullData: Ingredient = {
                     id: ingredientRef.id,
                     ...ingData, // Includes name, unit, lowStockThreshold, category, description
                     tenantId: firstTenantId,
                     createdAt: Timestamp.now(),
                     updatedAt: Timestamp.now()
                   };
                   batch.set(ingredientRef, ingredientFullData);
                   ingredientRefsByName[ingData.name] = ingredientRef.id;
                   console.log(`Prepared ingredient: ${ingData.name} for tenant ${firstTenantId}`);
            }

            for (const tenantDoc of tenantDocs) {
                const branches = [
                    { name: `Main Street Branch`, location: '123 Main St' },
                    { name: `Downtown Cafe`, location: '456 Central Ave' },
                ];
                for (const branchData of branches) {
                    const branchRef = doc(collection(firestoreDb, 'branches'));
                    const branchFullData: Branch = {
                        id: branchRef.id,
                        ...branchData,
                        tenant: { id: tenantDoc.id, name: tenantDoc.data.name },
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    };
                    batch.set(branchRef, branchFullData);
                    console.log(`Prepared branch: ${branchData.name} for tenant ${tenantDoc.data.name}`);

                    const usersForBranch = [
                        { email: `admin-${tenantDoc.id.substring(0,4)}-${branchRef.id.substring(0,4)}@example.com`, username: `Admin ${branchData.name.split(" ")[0]}`, role: 'admin', active: true, hashedPinCode: 'hashedpin123' },
                        { email: `manager-${tenantDoc.id.substring(0,4)}-${branchRef.id.substring(0,4)}@example.com`, username: `Manager ${branchData.name.split(" ")[0]}`, role: 'manager', active: true, hashedPinCode: 'hashedpin456' },
                        { email: `cashier-${tenantDoc.id.substring(0,4)}-${branchRef.id.substring(0,4)}@example.com`, username: `Cashier ${branchData.name.split(" ")[0]}`, role: 'cashier', active: true, hashedPinCode: 'hashedpin789' },
                    ];
                    for (const userData of usersForBranch) {
                        const userRef = doc(collection(firestoreDb, 'users'));
                        const userFullData: User = {
                            id: userRef.id, // User ID is the doc ID
                            firebaseUid: `seed-fbuid-${userRef.id}`, // Placeholder
                            ...userData,
                            tenant: { id: tenantDoc.id },
                            branch: { id: branchRef.id, name: branchFullData.name },
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now(),
                        };
                        batch.set(userRef, userFullData);
                        console.log(`Prepared user: ${userData.username} for branch ${branchData.name}`);
                    }
                    
                    const tablesForBranch: Omit<CafeTable, 'id' | 'branch' | 'createdAt' | 'updatedAt' | 'isActive'>[] = [
                        { tableNumber: 'A1', zone: 'Indoors', status: 'available', capacity: 2 },
                        { tableNumber: 'A2', zone: 'Indoors', status: 'occupied', currentOrder: { id: 'dummy-order-1', orderNumber: 'ORD-001' }, capacity: 4 },
                        { tableNumber: 'B1', zone: 'Patio', status: 'reserved', capacity: 4 },
                    ];

                    for (const tableData of tablesForBranch) {
                        const tableRef = doc(collection(firestoreDb, 'branches', branchRef.id, 'tables'));
                        const tableFullData: CafeTable = {
                            id: tableRef.id,
                            branch: { id: branchRef.id, name: branchFullData.name },
                            ...tableData,
                            isActive: true, // Default to active
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now(),
                        };
                        batch.set(tableRef, tableFullData);
                        console.log(`Prepared table: ${tableData.tableNumber} for branch ${branchData.name}`);
                    }


                    if (tenantDoc.id === firstTenantId) { // Seed inventory only for the first tenant's branches for simplicity
                        for(const ingName in ingredientRefsByName) {
                            const ingId = ingredientRefsByName[ingName];
                            const inventoryRef = doc(firestoreDb, 'branches', branchRef.id, 'inventory', ingId);
                            const ingDetails = ingredientsData.find(i => i.name === ingName);
                            const invData: BranchInventoryItem = {
                                id: ingId, // ID is the ingredientId
                                branch: { id: branchRef.id, name: branchFullData.name },
                                ingredient: { id: ingId, name: ingName, unit: ingDetails?.unit || 'unit' },
                                currentQuantity: Math.floor(Math.random() * ( (ingDetails?.lowStockThreshold || 50) * 3)) + (ingDetails?.lowStockThreshold || 50) ,
                                createdAt: Timestamp.now(),
                                updatedAt: Timestamp.now(),
                            };
                            batch.set(inventoryRef, invData);
                            console.log(`Prepared inventory for ${ingName} at branch ${branchData.name}`);
                        }
                    }
                }
            }
        }

        if (tenantDocs.length > 0) {
            const firstTenant = tenantDocs[0];
            const menuData: Omit<Menu, 'id' | 'createdAt' | 'updatedAt' | 'tenant' | 'version'> = {
                name: 'Main Menu', isActive: true, description: 'Our signature offerings'
            };
            const menuRef = doc(collection(firestoreDb, 'menus'));
            const menuFullData : Menu = {
                id: menuRef.id, ...menuData, tenant: { id: firstTenant.id, name: firstTenant.data.name },
                version: '1.0',
                createdAt: Timestamp.now(), updatedAt: Timestamp.now()
            }
            batch.set(menuRef, menuFullData);
            console.log(`Prepared menu: ${menuData.name} for tenant ${firstTenant.data.name}`);

            const menuItemsData: Omit<MenuItem, 'id' | 'menu' | 'createdAt' | 'updatedAt'>[] = [
                { name: 'Espresso', category: 'Coffee', price: 2.50, unit: 'cup', available: true, imageUrl: 'https://placehold.co/100x100/A0A0A0/FFFFFF?text=Espresso', tags: ['hot'] },
                { name: 'Latte', category: 'Coffee', price: 3.50, unit: 'cup', available: true, imageUrl: 'https://placehold.co/100x100/B0B0B0/FFFFFF?text=Latte', tags: ['hot'] },
                { name: 'Cappuccino', category: 'Coffee', price: 3.50, unit: 'cup', available: false, imageUrl: 'https://placehold.co/100x100/C0C0C0/FFFFFF?text=Cappuccino', tags: ['hot'] },
                { name: 'Croissant', category: 'Pastries', price: 2.00, unit: 'piece', available: true, imageUrl: 'https://placehold.co/100x100/D0D0D0/FFFFFF?text=Croissant', tags: ['baked'] },
                { name: 'Blueberry Muffin', category: 'Pastries', price: 2.25, unit: 'piece', available: true, imageUrl: 'https://placehold.co/100x100/E0E0E0/FFFFFF?text=Muffin', tags: ['baked', 'fruit'] },
            ];
            for (const itemData of menuItemsData) {
                const itemRef = doc(collection(firestoreDb, 'menus', menuRef.id, 'items'));
                const itemFullData: MenuItem = {
                  id: itemRef.id,
                  menu: { id: menuRef.id, name: menuFullData.name },
                  ...itemData,
                  createdAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                };
                batch.set(itemRef, itemFullData);
                console.log(`Prepared menu item: ${itemData.name} for menu ${menuData.name}`);

                if (itemData.name === 'Espresso' && ingredientRefsByName['Coffee Beans - Arabica']) {
                    const recipeIngredientId = ingredientRefsByName['Coffee Beans - Arabica'];
                    const recipeIngredientRef = doc(firestoreDb, 'menus', menuRef.id, 'items', itemRef.id, 'recipes', recipeIngredientId);
                    const ingDetails = ingredientsData.find(i => i.name === 'Coffee Beans - Arabica');
                    const recipeItemData: MenuItemRecipeItem = {
                        id: recipeIngredientId,
                        menuItem: { id: itemRef.id, name: itemData.name },
                        ingredient: { id: recipeIngredientId, name: 'Coffee Beans - Arabica', unit: ingDetails?.unit || 'gram' },
                        quantityNeeded: 18,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    };
                    batch.set(recipeIngredientRef, recipeItemData);
                    console.log(`Prepared recipe for Espresso`);
                }
            }
        }

        if (tenantDocs.length > 0) {
            const firstTenant = tenantDocs[0];
            const promotionsData: Omit<Promotion, 'id'|'tenant'|'createdAt'|'updatedAt'>[] = [
                { name: 'Grand Opening 10% Off', code: 'OPEN10', type: 'percentage', value: 10, minOrderValue: 5, startDate: Timestamp.fromDate(new Date()), endDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), isActive: true, appliesTo: 'all_orders' },
                { name: 'Summer Special $2 Off', code: 'SUMMER2', type: 'fixed_amount', value: 2, minOrderValue: 10, startDate: Timestamp.fromDate(new Date()), endDate: Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)), isActive: true, appliesTo: 'specific_items' },
            ];
            for (const promoData of promotionsData) {
                const promoRef = doc(collection(firestoreDb, 'promotions'));
                const promoFullData: Promotion = {
                    id: promoRef.id, ...promoData, tenant: { id: firstTenant.id, name: firstTenant.data.name },
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                };
                batch.set(promoRef, promoFullData);
                console.log(`Prepared promotion: ${promoData.name}`);
            }
        }

        await batch.commit();
        console.log('Database seeded successfully!');

    } catch (error) {
        console.error('Error seeding database:', error);
    }
}

if (require.main === module) {
    // initializeFirebaseClient() is called here, after dotenv has loaded env vars,
    // and before seedDatabase() which requires the db instance.
    try {
        initializeFirebaseClient();
        seedDatabase().catch(err => {
            console.error("Unhandled error in seedDatabase:", err);
            process.exit(1);
        });
    } catch (initError) {
        console.error("CRITICAL ERROR during Firebase initialization in seed script:", initError);
        process.exit(1);
    }
}
