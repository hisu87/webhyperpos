
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

import { db } from './firebase'; // Ensure this path is correct
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
    const batch = writeBatch(db);

    try {
        const tenantDocs: { id: string, data: Tenant }[] = [];
        for (const tenant of tenantsData) {
            const tenantRef = doc(collection(db, 'tenants'));
            const tenantFullData: Tenant = { 
                id: tenantRef.id, ...tenant, 
                createdAt: Timestamp.now(), // Use Timestamp.now() for direct execution
                updatedAt: Timestamp.now()  // Use Timestamp.now()
            };
            batch.set(tenantRef, tenantFullData);
            tenantDocs.push({ id: tenantRef.id, data: tenantFullData });
            console.log(`Prepared tenant: ${tenant.name}`);
        }

        const ingredientRefsByName: { [key: string]: string } = {}; 

        if (tenantDocs.length > 0) {
            const firstTenantId = tenantDocs[0].id;
            
            for (const ingData of ingredientsData) {
                const ingredientRef = doc(collection(db, 'ingredients'));
                 const ingredientFullData: Ingredient = { 
                    id: ingredientRef.id, 
                    ...ingData, 
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
                    const branchRef = doc(collection(db, 'branches'));
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
                        const userRef = doc(collection(db, 'users'));
                        const userFullData: User = {
                            id: userRef.id, 
                            firebaseUid: `seed-fbuid-${userRef.id}`, 
                            ...userData,
                            tenant: { id: tenantDoc.id },
                            branch: { id: branchRef.id, name: branchFullData.name },
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now(),
                        };
                        batch.set(userRef, userFullData);
                        console.log(`Prepared user: ${userData.username} for branch ${branchData.name}`);
                    }

                    const tablesForBranch: Omit<CafeTable, 'id' | 'branchId'>[] = [
                        { tableNumber: 'A1', zone: 'Indoors', status: 'available' },
                        { tableNumber: 'A2', zone: 'Indoors', status: 'occupied', currentOrder: { id: 'dummy-order-1', orderNumber: 'ORD-001' } },
                        { tableNumber: 'B1', zone: 'Patio', status: 'reserved' },
                    ];
                    for (const tableData of tablesForBranch) {
                        const tableRef = doc(collection(db, 'branches', branchRef.id, 'tables'));
                        batch.set(tableRef, {id: tableRef.id, branchId: branchRef.id, ...tableData}); 
                        console.log(`Prepared table: ${tableData.tableNumber} for branch ${branchData.name}`);
                    }

                     if (tenantDoc.id === firstTenantId) { 
                        for(const ingName in ingredientRefsByName) {
                            const ingId = ingredientRefsByName[ingName];
                            // Path for inventory is /branches/{branchId}/inventory/{ingredientId}
                            // The document ID *is* the ingredientId
                            const inventoryRef = doc(db, 'branches', branchRef.id, 'inventory', ingId); 
                            const ingDetails = ingredientsData.find(i => i.name === ingName);
                            const invData: Omit<BranchInventoryItem, 'updatedAt' | 'ingredientId'> = { // ingredientId is the doc ID
                                currentQuantity: Math.floor(Math.random() * ( (ingDetails?.lowStockThreshold || 50) * 3)) + (ingDetails?.lowStockThreshold || 50) ,
                                ingredientName: ingName,
                                unit: ingDetails?.unit || 'unit',
                            };
                            batch.set(inventoryRef, {...invData, updatedAt: Timestamp.now() });
                            console.log(`Prepared inventory for ${ingName} at branch ${branchData.name}`);
                        }
                    }
                }
            }
        }
        
        if (tenantDocs.length > 0) {
            const firstTenant = tenantDocs[0];
            const menuData: Omit<Menu, 'id' | 'createdAt' | 'updatedAt' | 'tenant'> = {
                name: 'Main Menu', isActive: true, description: 'Our signature offerings'
            };
            const menuRef = doc(collection(db, 'menus'));
            const menuFullData : Menu = {
                id: menuRef.id, ...menuData, tenant: { id: firstTenant.id },
                createdAt: Timestamp.now(), updatedAt: Timestamp.now()
            }
            batch.set(menuRef, menuFullData);
            console.log(`Prepared menu: ${menuData.name} for tenant ${firstTenant.data.name}`);

            const menuItemsData: Omit<MenuItem, 'id' | 'menuId'>[] = [
                { name: 'Espresso', category: 'Coffee', price: 2.50, unit: 'cup', available: true },
                { name: 'Latte', category: 'Coffee', price: 3.50, unit: 'cup', available: true },
                { name: 'Cappuccino', category: 'Coffee', price: 3.50, unit: 'cup', available: false },
                { name: 'Croissant', category: 'Pastries', price: 2.00, unit: 'piece', available: true },
                { name: 'Blueberry Muffin', category: 'Pastries', price: 2.25, unit: 'piece', available: true },
            ];
            for (const itemData of menuItemsData) {
                const itemRef = doc(collection(db, 'menus', menuRef.id, 'items'));
                batch.set(itemRef, {id: itemRef.id, menuId: menuRef.id, ...itemData}); 
                console.log(`Prepared menu item: ${itemData.name} for menu ${menuData.name}`);
                
                if (itemData.name === 'Espresso' && ingredientRefsByName['Coffee Beans - Arabica']) {
                    const recipeIngredientId = ingredientRefsByName['Coffee Beans - Arabica'];
                    // Path: /menus/{menuId}/items/{itemId}/recipe/{ingredientId}
                    // The document ID *is* the ingredientId
                    const recipeIngredientRef = doc(db, 'menus', menuRef.id, 'items', itemRef.id, 'recipe', recipeIngredientId);
                    const recipeItemData: Omit<MenuItemRecipeItem, 'id'> = { 
                        quantityNeeded: 18, 
                        unit: 'gram', 
                        ingredientName: 'Coffee Beans - Arabica' 
                    };
                    batch.set(recipeIngredientRef, recipeItemData);
                    console.log(`Prepared recipe for Espresso`);
                }
            }
        }

        if (tenantDocs.length > 0) {
            const firstTenantId = tenantDocs[0].id;
            const promotionsData: Omit<Promotion, 'id'|'tenantId'|'createdAt'|'updatedAt'>[] = [
                { name: 'Grand Opening 10% Off', code: 'OPEN10', type: 'percentage', value: 10, minOrderValue: 5, startDate: Timestamp.fromDate(new Date()), endDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), isActive: true },
                { name: 'Summer Special $2 Off', code: 'SUMMER2', type: 'fixed_amount', value: 2, minOrderValue: 10, startDate: Timestamp.fromDate(new Date()), endDate: Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)), isActive: true },
            ];
            for (const promoData of promotionsData) {
                const promoRef = doc(collection(db, 'promotions'));
                batch.set(promoRef, { 
                    id: promoRef.id, ...promoData, tenantId: firstTenantId, 
                    createdAt: Timestamp.now(), 
                    updatedAt: Timestamp.now() 
                });
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
    seedDatabase().catch(err => {
        console.error("Unhandled error in seedDatabase:", err);
        process.exit(1);
    });
}
