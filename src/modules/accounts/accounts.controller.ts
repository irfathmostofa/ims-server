import { FastifyReply, FastifyRequest } from "fastify";
import {
  accountHeadModel,
  accountingPeriodModel,
  accountModel,
  journalEntryModel,
  journalLineModel,
} from "./accounts.model";
import { successResponse } from "../../core/utils/response";
import pool from "../../config/db";
import { generatePrefixedId } from "../../core/models/idGenerator";

// account head
export async function createAccountHead(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const data = req.body as any;
    data.code = await generatePrefixedId("account_head", "AH");
    const head = await accountHeadModel.create(data);
    reply.send(successResponse(head, "Account head created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function listAccountHeads(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const heads = await accountHeadModel.findAll();
    reply.send(successResponse(heads, "Account heads retrieved successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateAccountHead(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.params as { id: string };
    const data = req.body as any;
    const updated = await accountHeadModel.update(parseInt(id), data);
    reply.send(successResponse(updated, "Account head updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteAccountHead(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.body as { id: string };
    const deleted = await accountHeadModel.delete(parseInt(id));
    reply.send(successResponse(deleted, "Account head deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// account
export async function createAccount(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = req.body as any;
    data.code = await generatePrefixedId("account", "AC");
    const account = await accountModel.create(data);
    reply.send(successResponse(account, "Account created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function listAccounts(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { branch_id, head_id } = req.query as any;
    const filters: Record<string, any> = {};
    if (branch_id) filters.branch_id = branch_id;
    if (head_id) filters.head_id = head_id;

    const accounts = await accountModel.findWithPagination(1, 1000, filters);
    reply.send(successResponse(accounts, "Accounts retrieved successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateAccount(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };
    const data = req.body as any;
    const updated = await accountModel.update(parseInt(id), data);
    reply.send(successResponse(updated, "Account updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteAccount(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as { id: string };
    const deleted = await accountModel.delete(parseInt(id));
    reply.send(successResponse(deleted, "Account deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// account period

export async function createAccountingPeriod(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const data = req.body as any;
    const period = await accountingPeriodModel.create(data);
    reply.send(
      successResponse(period, "Accounting period created successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function listAccountingPeriods(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const periods = await accountingPeriodModel.findAll();
    reply.send(
      successResponse(periods, "Accounting periods retrieved successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateAccountingPeriod(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.params as { id: string };
    const data = req.body as any;
    const updated = await accountingPeriodModel.update(parseInt(id), data);
    reply.send(
      successResponse(updated, "Accounting period updated successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteAccountingPeriod(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.body as { id: string };
    const deleted = await accountingPeriodModel.delete(parseInt(id));
    reply.send(
      successResponse(deleted, "Accounting period deleted successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// Journal Entry + Lines
export async function createJournalEntry(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { lines, ...entryData } = req.body as any;
    entryData.code = await generatePrefixedId("journal_entry", "JE");
    // Create journal entry
    const entry = await journalEntryModel.create(entryData);

    // Create journal lines
    for (const line of lines) {
      await journalLineModel.create({
        journal_entry_id: entry.id,
        account_id: line.account_id,
        debit: line.debit || 0,
        credit: line.credit || 0,
      });
    }

    await client.query("COMMIT");

    reply.send(successResponse(entry, "Journal entry created successfully"));
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

export async function listJournalEntries(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { branch_id, period_id } = req.body as any;
    const filters: Record<string, any> = {};
    if (branch_id) filters.branch_id = branch_id;
    if (period_id) filters.period_id = period_id;

    const entries = await journalEntryModel.findWithPagination(
      1,
      1000,
      filters
    );
    reply.send(
      successResponse(entries, "Journal entries retrieved successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateJournalEntry(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params as { id: string };
    const { lines, ...entryData } = req.body as any;

    // Update journal entry
    const updatedEntry = await journalEntryModel.update(
      parseInt(id),
      entryData
    );

    // If lines provided, delete old and insert new
    if (lines) {
      await pool.query("DELETE FROM journal_line WHERE journal_entry_id = $1", [
        id,
      ]);
      for (const line of lines) {
        await journalLineModel.create({
          journal_entry_id: updatedEntry.id,
          account_id: line.account_id,
          debit: line.debit || 0,
          credit: line.credit || 0,
        });
      }
    }

    await client.query("COMMIT");
    reply.send(
      successResponse(updatedEntry, "Journal entry updated successfully")
    );
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

export async function deleteJournalEntry(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.params as { id: string };
    const deleted = await journalEntryModel.delete(parseInt(id));
    reply.send(successResponse(deleted, "Journal entry deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function recordJournalTransaction({
  branch_id,
  period_id,
  entry_date,
  source_module,
  source_id,
  narration,
  lines, // array: { account_id, debit?, credit? }
}: {
  branch_id: number;
  period_id: number;
  entry_date: string;
  source_module?: string;
  source_id?: number;
  narration?: string;
  lines: Array<{ account_id: number; debit?: number; credit?: number }>;
}) {
  if (!lines || lines.length === 0) {
    throw new Error("Journal lines cannot be empty");
  }

  // Check that debit and credit are balanced
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

  if (totalDebit !== totalCredit) {
    throw new Error(
      `Unbalanced journal entry: Debit (${totalDebit}) != Credit (${totalCredit})`
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Generate unique entry number
    const entryNo = `JE${Date.now()}`;

    // Insert journal entry
    const {
      rows: [journalEntry],
    } = await client.query(
      `
      INSERT INTO journal_entry
        (branch_id, period_id, entry_no, entry_date, source_module, source_id, narration)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        branch_id,
        period_id,
        entryNo,
        entry_date,
        source_module,
        source_id,
        narration,
      ]
    );

    // Insert journal lines
    for (const line of lines) {
      await client.query(
        `
        INSERT INTO journal_line
          (journal_entry_id, account_id, debit, credit)
        VALUES ($1, $2, $3, $4)
        `,
        [journalEntry.id, line.account_id, line.debit || 0, line.credit || 0]
      );
    }

    await client.query("COMMIT");

    return {
      journal_entry_id: journalEntry.id,
      entry_no: journalEntry.entry_no,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getJournalEntries(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const {
      branch_id,
      period_id,
      source_module,
      date_from,
      date_to,
      page = 1,
      limit = 20,
    } = req.body as any;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (branch_id) {
      conditions.push(`je.branch_id = $${i++}`);
      values.push(branch_id);
    }

    if (period_id) {
      conditions.push(`je.period_id = $${i++}`);
      values.push(period_id);
    }

    if (source_module) {
      conditions.push(`je.source_module = $${i++}`);
      values.push(source_module);
    }

    if (date_from) {
      conditions.push(`je.entry_date >= $${i++}`);
      values.push(date_from);
    }

    if (date_to) {
      conditions.push(`je.entry_date <= $${i++}`);
      values.push(date_to);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        je.id,
        je.entry_no,
        je.entry_date,
        je.branch_id,
        je.source_module,
        je.source_id,
        je.narration,
        COALESCE(SUM(jl.debit), 0) AS total_debit,
        COALESCE(SUM(jl.credit), 0) AS total_credit
      FROM journal_entry je
      LEFT JOIN journal_line jl ON je.id = jl.journal_entry_id
      ${whereClause}
      GROUP BY je.id
      ORDER BY je.entry_date DESC, je.id DESC
      LIMIT $${i++} OFFSET $${i}
    `;

    values.push(limitNum, offset);

    const { rows } = await pool.query(query, values);

    reply.send(
      successResponse(rows, "Journal entries retrieved successfully")
    );
  } catch (err: any) {
    reply.status(400).send({
      success: false,
      message: err.message,
    });
  }
}
