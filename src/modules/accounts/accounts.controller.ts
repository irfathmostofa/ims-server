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
  reply: FastifyReply,
) {
  try {
    const data = req.body as any;
    const userId = (req.user as any)?.id;
    data.code = await generatePrefixedId("account_head", "AH");
    data.created_by = userId;
    const head = await accountHeadModel.create(data);
    reply.send(successResponse(head, "Account head created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function listAccountHeads(
  req: FastifyRequest,
  reply: FastifyReply,
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
  reply: FastifyReply,
) {
  try {
    const { id } = req.params as { id: string };
    const data = req.body as any;
    const userId = (req.user as any)?.id;
    data.updated_by = userId;
    const updated = await accountHeadModel.update(parseInt(id), data);
    reply.send(successResponse(updated, "Account head updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteAccountHead(
  req: FastifyRequest,
  reply: FastifyReply,
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
  reply: FastifyReply,
) {
  try {
    const data = req.body as any;
    const period = await accountingPeriodModel.create(data);
    reply.send(
      successResponse(period, "Accounting period created successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function listAccountingPeriods(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const periods = await accountingPeriodModel.findAll();
    reply.send(
      successResponse(periods, "Accounting periods retrieved successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateAccountingPeriod(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.params as { id: string };
    const data = req.body as any;
    const updated = await accountingPeriodModel.update(parseInt(id), data);
    reply.send(
      successResponse(updated, "Accounting period updated successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteAccountingPeriod(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.body as { id: string };
    const deleted = await accountingPeriodModel.delete(parseInt(id));
    reply.send(
      successResponse(deleted, "Accounting period deleted successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// Journal Entry + Lines
export async function createJournalEntry(
  req: FastifyRequest,
  reply: FastifyReply,
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
  reply: FastifyReply,
) {
  try {
    const { branch_id, period_id } = req.body as any;
    const filters: Record<string, any> = {};
    if (branch_id) filters.branch_id = branch_id;
    if (period_id) filters.period_id = period_id;

    const entries = await journalEntryModel.findWithPagination(
      1,
      1000,
      filters,
    );
    reply.send(
      successResponse(entries, "Journal entries retrieved successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateJournalEntry(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params as { id: string };
    const { lines, ...entryData } = req.body as any;

    // Update journal entry
    const updatedEntry = await journalEntryModel.update(
      parseInt(id),
      entryData,
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
      successResponse(updatedEntry, "Journal entry updated successfully"),
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
  reply: FastifyReply,
) {
  try {
    const { id } = req.params as { id: string };
    const deleted = await journalEntryModel.delete(parseInt(id));
    reply.send(successResponse(deleted, "Journal entry deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function manualJournalTransaction(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { branch_id, period_id, entry_date, narration, lines } =
      req.body as any;

    const {
      rows: [period],
    } = await pool.query(
      "SELECT is_closed FROM accounting_period WHERE id = $1",
      [period_id],
    );

    if (!period) {
      throw new Error("Accounting period not found");
    }

    if (period.is_closed) {
      throw new Error("Cannot post journal in a closed accounting period");
    }

    const journal = await recordJournalTransaction({
      branch_id,
      period_id,
      entry_date,
      source_module: "MANUAL_JOURNAL",
      narration,
      lines,
    });

    reply.send(
      successResponse(journal, "Manual journal entry created successfully"),
    );
  } catch (error: any) {
    reply.status(400).send({
      success: false,
      message: error.message,
    });
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
      `Unbalanced journal entry: Debit (${totalDebit}) != Credit (${totalCredit})`,
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Generate unique entry number
    const entryNo = await generatePrefixedId("journal_entry", "ENT");

    // Insert journal entry
    const {
      rows: [journalEntry],
    } = await client.query(
      `
      INSERT INTO journal_entry
        (branch_id, period_id, code, entry_date, source_module, source_id, narration)
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
      ],
    );

    // Insert journal lines
    for (const line of lines) {
      await client.query(
        `
        INSERT INTO journal_line
          (journal_entry_id, account_id, debit, credit)
        VALUES ($1, $2, $3, $4)
        `,
        [journalEntry.id, line.account_id, line.debit, line.credit],
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
  reply: FastifyReply,
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

    // Count total records for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT je.id) as total
      FROM journal_entry je
      ${whereClause}
    `;

    const countResult = await pool.query(
      countQuery,
      values.slice(0, conditions.length),
    );
    const totalRecords = parseInt(countResult.rows[0].total);

    const query = `
      SELECT 
        je.id,
        je.code,
        je.entry_date,
        je.branch_id,
        je.period_id,
        je.source_module,
        je.source_id,
        je.narration,
        je.created_at,
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', jl.id,
              'journal_entry_id', jl.journal_entry_id,
              'account_id', jl.account_id,
              'debit_amount', jl.debit,
              'credit_amount', jl.credit,
              'account_code', a.code,
              'account_name', a.name
            ) ORDER BY jl.id
          )
          FROM journal_line jl
          JOIN account a ON jl.account_id = a.id
          WHERE jl.journal_entry_id = je.id
        ) AS lines,
        (
          SELECT COALESCE(SUM(debit), 0)
          FROM journal_line jl2
          WHERE jl2.journal_entry_id = je.id
        ) as total_debit,
        (
          SELECT COALESCE(SUM(credit), 0)
          FROM journal_line jl3
          WHERE jl3.journal_entry_id = je.id
        ) as total_credit
      FROM journal_entry je
      ${whereClause}
      ORDER BY je.entry_date DESC, je.id DESC
      LIMIT $${i} OFFSET $${i + 1}
    `;

    // Add limit and offset values
    const queryValues = [...values, limitNum, offset];

    const { rows } = await pool.query(query, queryValues);

    reply.send(
      successResponse(
        {
          data: rows,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalRecords,
            totalPages: Math.ceil(totalRecords / limitNum),
          },
        },
        "Journal entries retrieved successfully",
      ),
    );
  } catch (err: any) {
    console.error("Error fetching journal entries:", err);
    reply.status(400).send({
      success: false,
      message: err.message,
    });
  }
}
