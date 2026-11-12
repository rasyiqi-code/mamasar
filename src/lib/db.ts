/**
 * Database Facade (Modular Domain Architecture)
 * 
 * In accordance with "My Skill: The Signature Developer Blueprint",
 * this file acts as a unified facade exporting types and domain operations
 * from focused domain modules (<300 lines each) located in `src/lib/modules/`.
 */

export { getDb, type Database } from './client';

// Types & Contracts
export * from './modules/types';

// Domain Modules
export * from './modules/articles';
export * from './modules/events';
export * from './modules/auth';
export * from './modules/users';
export * from './modules/zones';
export * from './modules/stores';
export * from './modules/products';
export * from './modules/cashbook';
export * from './modules/favorites';
export * from './modules/promotions';
