import { SEEDER_CONFIG } from '../config';
/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

/**
 * Recurring Templates and Occurrences Seeder
 */

import { db } from '@/db';
import { recurringTemplates, recurringOccurrences, transactions } from '@/db/schema';
import {
  calculateDueDate,
  shouldGenerateOccurrence,
  generateInstallmentDescription,
} from '@/lib/utils/recurring-dates';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { SEED_TIME_HOUR } from '../lib/dates';
import { amt } from '../lib/amounts';
import { RECURRING_TEMPLATE_DATA } from '../data/recurring';

/**
 * Seed recurring templates and occurrences with mixed statuses.
 */
export async function seedRecurringData(
  workspaceId: string,
  userId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>
): Promise<{
  templateCount: number;
  occurrenceCount: number;
  confirmedCount: number;
  skippedCount: number;
}> {
  console.log('🔁 Seeding recurring templates and occurrences...');

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const windowStartIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1))
    .toISOString()
    .slice(0, 10);
  const windowEndIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 3, 0))
    .toISOString()
    .slice(0, 10);

  let templateCount = 0;
  let occurrenceCount = 0;
  let confirmedCount = 0;
  let skippedCount = 0;

  for (const seedTemplate of RECURRING_TEMPLATE_DATA) {
    const categoryId = categoryMap.get(seedTemplate.category);
    const accountId = accountMap.get(seedTemplate.account);

    if (!categoryId || !accountId) {
      console.warn(
        `Skipping recurring template "${seedTemplate.name}" due to missing category/account mapping.`
      );
      continue;
    }

    const templateId = nanoid();
    const templateStatus = seedTemplate.status || 'active';
    const startingOccurrence = seedTemplate.startingOccurrenceNumber || 1;

    await db.insert(recurringTemplates).values({
      id: templateId,
      workspace_id: workspaceId,
      created_by_user_id: userId,
      name: seedTemplate.name,
      type: seedTemplate.type,
      amount: amt(Number(seedTemplate.amount), SEEDER_CONFIG.PRIMARY_CURRENCY),
      currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
      category_id: categoryId,
      account_id: accountId,
      day_of_month: seedTemplate.dayOfMonth,
      start_date: seedTemplate.startDate,
      end_date: seedTemplate.endDate || null,
      total_occurrences: seedTemplate.totalOccurrences || null,
      is_installment: seedTemplate.isInstallment || false,
      installment_label: seedTemplate.installmentLabel || null,
      starting_occurrence_number: startingOccurrence,
      frequency: seedTemplate.frequency || 'monthly',
      interval_count: seedTemplate.intervalCount || 1,
      description: seedTemplate.description || null,
      status: templateStatus,
      created_at: now,
      updated_at: now,
    });

    templateCount++;

    const generatedOccurrences: Array<{ id: string; dueDate: string; occurrenceNumber: number }> =
      [];

    for (let offset = 0; offset < 72; offset++) {
      const occurrenceNumber = startingOccurrence + offset;
      const dueDate = calculateDueDate(
        seedTemplate.startDate,
        seedTemplate.dayOfMonth,
        offset,
        seedTemplate.frequency || 'monthly',
        seedTemplate.intervalCount || 1
      );

      if (dueDate < windowStartIso) {
        continue;
      }

      if (dueDate > windowEndIso) {
        break;
      }

      if (
        !shouldGenerateOccurrence(
          {
            total_occurrences: seedTemplate.totalOccurrences || null,
            end_date: seedTemplate.endDate || null,
          },
          occurrenceNumber,
          dueDate
        )
      ) {
        break;
      }

      const occurrenceId = nanoid();
      const dueAt = new Date(`${dueDate}T${String(SEED_TIME_HOUR).padStart(2, '0')}:00:00.000Z`);

      await db.insert(recurringOccurrences).values({
        id: occurrenceId,
        template_id: templateId,
        workspace_id: workspaceId,
        due_date: dueDate,
        occurrence_number: occurrenceNumber,
        status: 'pending',
        transaction_id: null,
        confirmed_amount: null,
        skip_reason: null,
        confirmed_at: null,
        created_at: dueAt,
        updated_at: dueAt,
      });

      generatedOccurrences.push({ id: occurrenceId, dueDate, occurrenceNumber });
      occurrenceCount++;
    }

    if (templateStatus !== 'active') {
      continue;
    }

    const pastOccurrences = generatedOccurrences
      .filter((occurrence) => occurrence.dueDate < todayIso)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const firstPast = pastOccurrences[0];
    if (firstPast) {
      const transactionId = nanoid();
      const transactionDate = new Date(
        `${firstPast.dueDate}T${String(SEED_TIME_HOUR).padStart(2, '0')}:00:00.000Z`
      );
      const description =
        seedTemplate.isInstallment && seedTemplate.totalOccurrences
          ? generateInstallmentDescription(
              seedTemplate.name,
              seedTemplate.installmentLabel || 'Installment',
              firstPast.occurrenceNumber,
              seedTemplate.totalOccurrences
            )
          : seedTemplate.description || seedTemplate.name;

      await db.insert(transactions).values({
        id: transactionId,
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: categoryId,
        account_id: accountId,
        type: seedTemplate.type,
        amount: amt(Number(seedTemplate.amount), SEEDER_CONFIG.PRIMARY_CURRENCY),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        description,
        transaction_date: transactionDate,
        created_at: transactionDate,
        updated_at: transactionDate,
      });

      await db
        .update(recurringOccurrences)
        .set({
          status: 'confirmed',
          transaction_id: transactionId,
          confirmed_amount: amt(Number(seedTemplate.amount), SEEDER_CONFIG.PRIMARY_CURRENCY),
          confirmed_at: transactionDate,
          updated_at: transactionDate,
        })
        .where(eq(recurringOccurrences.id, firstPast.id));

      confirmedCount++;
    }

    const secondPast = pastOccurrences[1];
    if (secondPast) {
      await db
        .update(recurringOccurrences)
        .set({
          status: 'skipped',
          skip_reason: 'Seeded example: skipped this month',
          updated_at: now,
        })
        .where(eq(recurringOccurrences.id, secondPast.id));

      skippedCount++;
    }
  }

  console.log(
    `✓ Created ${templateCount} recurring templates, ${occurrenceCount} occurrences (${confirmedCount} confirmed, ${skippedCount} skipped)`
  );

  return { templateCount, occurrenceCount, confirmedCount, skippedCount };
}
