/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

/**
 * Audit Logs Seeder
 */

import { db } from '@/db';
import { transactions, auditLogs } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * Seed transaction audit logs for demo history feature
 * Picks some recent transactions and creates realistic audit trail entries:
 * - Create events for selected transactions
 * - Update events (simulating edits by another user)
 * - Delete events for a few transactions
 */
export async function seedTransactionAuditLogs(
  workspaceId: string,
  adminUserId: string,
  memberUserId: string
): Promise<{
  createCount: number;
  updateCount: number;
  deleteCount: number;
}> {
  console.log('📝 Seeding transaction audit logs...');

  // Get recent transactions to add audit history to
  const recentTransactions = await db.query.transactions.findMany({
    where: eq(transactions.workspace_id, workspaceId),
    orderBy: [sql`${transactions.created_at} DESC`],
    limit: 20,
    with: {
      category: { columns: { id: true, name: true } },
      account: { columns: { id: true, name: true } },
    },
  });

  if (recentTransactions.length === 0) {
    return { createCount: 0, updateCount: 0, deleteCount: 0 };
  }

  let createCount = 0;
  let updateCount = 0;
  let deleteCount = 0;

  // Create "create" audit entries for all selected transactions
  for (const t of recentTransactions) {
    await db.insert(auditLogs).values({
      id: nanoid(),
      workspace_id: workspaceId,
      user_id: adminUserId,
      action: 'create',
      entity_type: 'transaction',
      entity_id: t.id,
      old_value: null,
      new_value: JSON.stringify({
        amount: t.amount,
        currency: t.currency,
        type: t.type,
        category_id: t.category_id,
        account_id: t.account_id,
        description: t.description,
        transaction_date:
          t.transaction_date instanceof Date
            ? t.transaction_date.toISOString()
            : t.transaction_date,
      }),
      created_at: t.created_at,
    });
    createCount++;
  }

  // Add "update" events for ~10 transactions (simulating edits by member user)
  const editCandidates = recentTransactions.slice(0, 10);
  for (const t of editCandidates) {
    const oldAmount = t.amount;
    const newAmount = String(Math.round(Number(oldAmount) * (0.8 + Math.random() * 0.4)));

    const editDate = new Date(
      t.created_at instanceof Date ? t.created_at.getTime() : Number(t.created_at)
    );
    editDate.setDate(editDate.getDate() + 1 + Math.floor(Math.random() * 3));

    await db.insert(auditLogs).values({
      id: nanoid(),
      workspace_id: workspaceId,
      user_id: memberUserId,
      action: 'update',
      entity_type: 'transaction',
      entity_id: t.id,
      old_value: JSON.stringify({ amount: oldAmount }),
      new_value: JSON.stringify({ amount: newAmount }),
      created_at: editDate,
    });

    // Persist the amount change to the transaction row
    await db
      .update(transactions)
      .set({ amount: newAmount, updated_at: editDate, updated_by_user_id: memberUserId })
      .where(eq(transactions.id, t.id));

    updateCount++;

    // Add a second edit for some transactions
    if (Math.random() > 0.5) {
      const secondEditDate = new Date(editDate);
      secondEditDate.setHours(secondEditDate.getHours() + 2);
      const newDesc = `${t.description || 'Transaction'} (updated)`;

      await db.insert(auditLogs).values({
        id: nanoid(),
        workspace_id: workspaceId,
        user_id: adminUserId,
        action: 'update',
        entity_type: 'transaction',
        entity_id: t.id,
        old_value: JSON.stringify({ description: t.description }),
        new_value: JSON.stringify({ description: newDesc }),
        created_at: secondEditDate,
      });

      // Persist the description change to the transaction row
      await db
        .update(transactions)
        .set({ description: newDesc, updated_at: secondEditDate, updated_by_user_id: adminUserId })
        .where(eq(transactions.id, t.id));

      updateCount++;
    }
  }

  // Add "delete" events for 2 transactions and soft-delete them
  const deleteCandidates = recentTransactions.slice(10, 12);
  for (const t of deleteCandidates) {
    const deleteDate = new Date(
      t.created_at instanceof Date ? t.created_at.getTime() : Number(t.created_at)
    );
    deleteDate.setDate(deleteDate.getDate() + 5);

    await db.insert(auditLogs).values({
      id: nanoid(),
      workspace_id: workspaceId,
      user_id: memberUserId,
      action: 'delete',
      entity_type: 'transaction',
      entity_id: t.id,
      old_value: JSON.stringify({
        amount: t.amount,
        currency: t.currency,
        type: t.type,
        category_id: t.category_id,
        account_id: t.account_id,
        description: t.description,
      }),
      new_value: null,
      created_at: deleteDate,
    });

    // Soft-delete the transaction
    await db
      .update(transactions)
      .set({
        deleted_at: deleteDate,
        deleted_by_user_id: memberUserId,
      })
      .where(eq(transactions.id, t.id));

    deleteCount++;
  }

  console.log(
    `✓ Created ${createCount} create + ${updateCount} update + ${deleteCount} delete audit entries`
  );

  return { createCount, updateCount, deleteCount };
}
