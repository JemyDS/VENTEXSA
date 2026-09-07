/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * ESQUEMA DE TABLAS. Las migraciones SQL contienen además índices y triggers: leer drizzle/ para conocer todas las restricciones efectivas.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const revisions = sqliteTable('revisions', {
    tenant: text('tenant').notNull(), revision: integer('revision').notNull(), operation: text('operation').notNull(), actor: text('actor').notNull(), at: text('at').notNull()
}, t => [
    primaryKey({
        columns: [
            t.tenant, t.revision
        ]
    })
]);
export const workspaces = sqliteTable('workspaces', {
    tenant: text('tenant').primaryKey(), revision: integer('revision').notNull(), data: text('data').notNull()
});
export const estimatedMeasures = sqliteTable('estimated_measures', {
    id: text('id').primaryKey(), tenant: text('tenant').notNull(), vano: text('vano').notNull(), data: text('data').notNull()
});
export const officialMeasures = sqliteTable('official_measures', {
    id: text('id').primaryKey(), tenant: text('tenant').notNull(), vano: text('vano').notNull(), data: text('data').notNull()
});
export const orders = sqliteTable('orders', {
    id: text('id').primaryKey(), tenant: text('tenant').notNull(), data: text('data').notNull()
});
export const orderMeasures = sqliteTable('order_measures', {
    orderId: text('order_id').notNull().references(() => orders.id), officialId: text('official_id').notNull().references(() => officialMeasures.id)
}, t => [
    primaryKey({
        columns: [
            t.orderId, t.officialId
        ]
    })
]);
export const audit = sqliteTable('audit', {
    id: text('id').primaryKey(), tenant: text('tenant').notNull(), revision: integer('revision').notNull(), actor: text('actor').notNull(), at: text('at').notNull(), action: text('action').notNull(), data: text('data').notNull(), hash: text('hash').notNull(), previousHash: text('previous_hash').notNull()
});
export const files = sqliteTable('files', {
    id: text('id').primaryKey(), tenant: text('tenant').notNull(), name: text('name').notNull(), mime: text('mime').notNull(), size: integer('size').notNull(), hash: text('hash').notNull(), createdAt: text('created_at').notNull()
});
export const imageJobs = sqliteTable('image_jobs', {
    id: text('id').primaryKey(), actor: text('actor').notNull(), createdAt: integer('created_at').notNull(), status: text('status').notNull()
}, t => [
    index('image_jobs_actor_time').on(t.actor, t.createdAt)
]);
