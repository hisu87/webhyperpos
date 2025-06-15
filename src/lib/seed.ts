
// To run this seed script:
// 1. Ensure you have tsx installed (npm install -g tsx) or use ts-node.
// 2. Set up your Firebase client config in .env file (NEXT_PUBLIC_FIREBASE_...).
// 3. Run from the root of your project: `tsx src/lib/seed.ts`

import { config as dotenvConfig } from 'dotenv';
dotenvConfig(); // Load environment variables from .env file

import { db } from './firebase'; // Ensure this path is correct
import { collection, doc, setDoc, addDoc, serverTimestamp, writeBatch, Timestamp } from 'firebase/firestore';
import type { 
    Tenant, Branch, User, Menu, MenuItem, CafeTable, Promotion, Customer, 
    Order, OrderItem, QRPaymentRequest, Ingredient, BranchInventoryItem, 
    StockMovement, ShiftReport, Notification, DenormalizedTenantRef, DenormalizedBranchRef 
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
        // --- Seed Tenants ---
        const tenantDocs: { id: string, data: Tenant }[] = [];
        for (const tenant of tenantsData) {
            const tenantRef = doc(collection(db, 'tenants'));
            const tenantFullData: Tenant = { 
                id: tenantRef.id, ...tenant, 
                createdAt: serverTimestamp() as Timestamp, 
                updatedAt: serverTimestamp() as Timestamp 
            };
            batch.set(tenantRef, tenantFullData);
            tenantDocs.push({ id: tenantRef.id, data: tenantFullData });
            console.log(`Prepared tenant: ${tenant.name}`);
        }

        // --- Seed Ingredients (associated with first tenant for example) ---
        if (tenantDocs.length > 0) {
            const firstTenantId = tenantDocs[0].id;
            const ingredientRefs: { [key: string]: string } = {}; // To store ingredientId by name

            for (const ingData of ingredientsData) {
                const ingredientRef = doc(collection(db, 'ingredients'));
                 const ingredientFullData: Ingredient = { 
                    id: ingredientRef.id, 
                    ...ingData, 
                    tenantId: firstTenantId,
                    createdAt: serverTimestamp() as Timestamp, 
                    updatedAt: serverTimestamp() as Timestamp 
                };
                batch.set(ingredientRef, ingredientFullData);
                ingredientRefs[ingData.name] = ingredientRef.id;
                console.log(`Prepared ingredient: ${ingData.name} for tenant ${firstTenantId}`);
            }
        
            // --- Seed Branches (for each tenant) ---
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
                        createdAt: serverTimestamp() as Timestamp,
                        updatedAt: serverTimestamp() as Timestamp,
                    };
                    batch.set(branchRef, branchFullData);
                    console.log(`Prepared branch: ${branchData.name} for tenant ${tenantDoc.data.name}`);

                    // --- Seed Users (for this branch) ---
                    const usersForBranch = [
                        { email: `admin-${tenantDoc.id.substring(0,4)}-${branchRef.id.substring(0,4)}@example.com`, username: `Admin ${branchData.name.split(" ")[0]}`, role: 'admin', active: true },
                        { email: `manager-${tenantDoc.id.substring(0,4)}-${branchRef.id.substring(0,4)}@example.com`, username: `Manager ${branchData.name.split(" ")[0]}`, role: 'manager', active: true },
                        { email: `cashier-${tenantDoc.id.substring(0,4)}-${branchRef.id.substring(0,4)}@example.com`, username: `Cashier ${branchData.name.split(" ")[0]}`, role: 'cashier', active: true },
                    ];
                    for (const userData of usersForBranch) {
                        // In a real scenario, Firebase UID would come from Auth. For seeding, we use a placeholder or skip.
                        // This seed script doesn't create Firebase Auth users.
                        const userRef = doc(collection(db, 'users')); // Or use email as doc ID if unique and desired
                        const userFullData: User = {
                            id: userRef.id,
                            firebaseUid: `seed-uid-${userRef.id}`, // Placeholder
                            ...userData,
                            tenant: { id: tenantDoc.id },
                            branch: { id: branchRef.id, name: branchFullData.name },
                            createdAt: serverTimestamp() as Timestamp,
                            updatedAt: serverTimestamp() as Timestamp,
                        };
                        batch.set(userRef, userFullData);
                        console.log(`Prepared user: ${userData.username} for branch ${branchData.name}`);
                    }

                    // --- Seed Tables (for this branch) ---
                    const tablesForBranch: Omit<CafeTable, 'id'>[] = [
                        { tableNumber: 'A1', zone: 'Indoors', status: 'available' },
                        { tableNumber: 'A2', zone: 'Indoors', status: 'occupied', currentOrder: { id: 'dummy-order-1', orderNumber: 'ORD-001' } },
                        { tableNumber: 'B1', zone: 'Patio', status: 'reserved' },
                    ];
                    for (const tableData of tablesForBranch) {
                        const tableRef = doc(collection(db, 'branches', branchRef.id, 'tables'));
                        batch.set(tableRef, {id: tableRef.id, ...tableData});
                        console.log(`Prepared table: ${tableData.tableNumber} for branch ${branchData.name}`);
                    }
                     // --- Seed Inventory (for this branch, using ingredients of the first tenant) ---
                     if (tenantDoc.id === firstTenantId) { // Only seed inventory for branches of the first tenant that has ingredients
                        for(const ingName in ingredientRefs) {
                            const ingId = ingredientRefs[ingName];
                            const inventoryRef = doc(db, 'branches', branchRef.id, 'inventory', ingId); // Doc ID is ingredientId
                            const invData: Omit<BranchInventoryItem, 'updatedAt'> = {
                                currentQuantity: Math.floor(Math.random() * 1000) + 50, // Random quantity
                                ingredientName: ingName,
                                unit: ingredientsData.find(i => i.name === ingName)?.unit || 'unit',
                            };
                            batch.set(inventoryRef, {...invData, updatedAt: serverTimestamp() as Timestamp });
                            console.log(`Prepared inventory for ${ingName} at branch ${branchData.name}`);
                        }
                    }
                }
            }
        }
        
        // --- Seed Menus (for first tenant) ---
        if (tenantDocs.length > 0) {
            const firstTenant = tenantDocs[0];
            const menuData: Omit<Menu, 'id' | 'createdAt' | 'updatedAt' | 'tenant'> = {
                name: 'Main Menu', isActive: true, description: 'Our signature offerings'
            };
            const menuRef = doc(collection(db, 'menus'));
            const menuFullData : Menu = {
                id: menuRef.id, ...menuData, tenant: { id: firstTenant.id },
                createdAt: serverTimestamp() as Timestamp, updatedAt: serverTimestamp() as Timestamp
            }
            batch.set(menuRef, menuFullData);
            console.log(`Prepared menu: ${menuData.name} for tenant ${firstTenant.data.name}`);

            // --- Seed Menu Items (for this menu) ---
            const menuItemsData: Omit<MenuItem, 'id'>[] = [
                { name: 'Espresso', category: 'Coffee', price: 2.50, unit: 'cup', available: true },
                { name: 'Latte', category: 'Coffee', price: 3.50, unit: 'cup', available: true },
                { name: 'Cappuccino', category: 'Coffee', price: 3.50, unit: 'cup', available: false },
                { name: 'Croissant', category: 'Pastries', price: 2.00, unit: 'piece', available: true },
                { name: 'Blueberry Muffin', category: 'Pastries', price: 2.25, unit: 'piece', available: true },
            ];
            for (const itemData of menuItemsData) {
                const itemRef = doc(collection(db, 'menus', menuRef.id, 'items'));
                batch.set(itemRef, {id: itemRef.id, ...itemData});
                console.log(`Prepared menu item: ${itemData.name} for menu ${menuData.name}`);
                // Seed Recipe (Example for Espresso)
                // if (itemData.name === 'Espresso' && ingredientRefs['Coffee Beans - Arabica']) {
                //     const recipeRef = doc(db, 'menus', menuRef.id, 'items', itemRef.id, 'recipe', ingredientRefs['Coffee Beans - Arabica']);
                //     batch.set(recipeRef, { quantityNeeded: 18, unit: 'gram', ingredientName: 'Coffee Beans - Arabica' });
                //     console.log(`Prepared recipe for Espresso`);
                // }
            }
        }

        // --- Seed Promotions (for first tenant) ---
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
                    createdAt: serverTimestamp() as Timestamp, 
                    updatedAt: serverTimestamp() as Timestamp 
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

// Check if the script is run directly
if (require.main === module) {
    seedDatabase().catch(err => {
        console.error("Unhandled error in seedDatabase:", err);
        process.exit(1);
    });
}
