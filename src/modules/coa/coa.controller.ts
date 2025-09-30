import pool from "../../config/db";
import { FastifyRequest, FastifyReply } from "fastify";
import { coaModel, journalEntryModel, journalLineModel } from "./coa.model";
import { generatePrefixedId } from "../../core/models/idGenerator";

// ===== TYPES =====
interface JournalLine {
  account_id: number;
  debit?: number;
  credit?: number;
}

interface CreateJournalBody {
  entry_date?: string;
  reference_type?: string;
  reference_id?: number;
  lines: JournalLine[];
}

interface UpdateJournalBody {
  entry_date?: string;
  reference_type?: string;
  reference_id?: number;
  lines?: JournalLine[];
}

// ===== HELPER FUNCTIONS =====

/**
 * Validate double-entry bookkeeping (Debit = Credit)
 */
function validateDoubleEntry(lines: JournalLine[]): void {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    totalDebit += line.debit || 0;
    totalCredit += line.credit || 0;
  }

  // Round to 2 decimal places to avoid floating point issues
  totalDebit = Math.round(totalDebit * 100) / 100;
  totalCredit = Math.round(totalCredit * 100) / 100;

  if (totalDebit !== totalCredit) {
    throw new Error(
      `Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`
    );
  }

  if (totalDebit === 0 || totalCredit === 0) {
    throw new Error(
      "Journal entry must have at least one debit and one credit"
    );
  }
}

/**
 * Get COA hierarchy as a tree
 */
async function buildCOATree(
  parentId: number | null = null,
  client?: any
): Promise<any[]> {
  const queryRunner = client || pool;

  const { rows } = await queryRunner.query(
    "SELECT * FROM coa WHERE parent_id IS NOT DISTINCT FROM $1 ORDER BY code",
    [parentId]
  );

  const tree = [];
  for (const account of rows) {
    const children = await buildCOATree(account.id, queryRunner);
    tree.push({
      ...account,
      children: children.length > 0 ? children : undefined,
    });
  }

  return tree;
}

// ===== CHART OF ACCOUNTS (COA) CONTROLLERS =====

/**
 * Create COA Account
 */
export async function createCOA(
  req: FastifyRequest<{
    Body: {
      code: string;
      parent_id?: number;
      name: string;
      type: "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE";
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { code, parent_id, name, type } = req.body;

    // Validate parent exists if provided
    if (parent_id) {
      const parent = await coaModel.findById(parent_id);
      if (!parent) {
        throw new Error("Parent account not found");
      }
    }

    const account = await coaModel.create({
      code,
      parent_id: parent_id || null,
      name,
      type,
      created_by: (req.user as { id: number }).id,
    });

    reply.send({
      success: true,
      data: account,
      message: "Account created successfully",
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Get All COA Accounts (Flat List)
 */
export async function getAllCOA(
  req: FastifyRequest<{
    Querystring: {
      type?: string;
      parent_id?: string;
      search?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { type, parent_id, search } = req.query;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(type);
    }

    if (parent_id) {
      if (parent_id === "null") {
        conditions.push("parent_id IS NULL");
      } else {
        conditions.push(`parent_id = $${paramIndex++}`);
        values.push(parseInt(parent_id));
      }
    }

    if (search) {
      conditions.push(
        `(name ILIKE $${paramIndex++} OR code ILIKE $${paramIndex++})`
      );
      values.push(`%${search}%`, `%${search}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT 
        c.*,
        p.name as parent_name
      FROM coa c
      LEFT JOIN coa p ON c.parent_id = p.id
      ${whereClause}
      ORDER BY c.code`,
      values
    );

    reply.send({
      success: true,
      data: rows,
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Get COA Tree (Hierarchical)
 */
export async function getCOATree(
  req: FastifyRequest<{
    Querystring: {
      type?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { type } = req.query;

    let tree;
    if (type) {
      // Get only accounts of specific type
      const { rows } = await pool.query(
        "SELECT * FROM coa WHERE type = $1 AND parent_id IS NULL ORDER BY code",
        [type]
      );

      tree = [];
      for (const account of rows) {
        const children = await buildCOATree(account.id);
        tree.push({
          ...account,
          children: children.length > 0 ? children : undefined,
        });
      }
    } else {
      // Get all accounts as tree
      tree = await buildCOATree(null);
    }

    reply.send({
      success: true,
      data: tree,
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Get Single COA Account
 */
export async function getCOA(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const accountId = parseInt(req.params.id);

    const { rows } = await pool.query(
      `SELECT 
        c.*,
        p.name as parent_name,
        p.code as parent_code
      FROM coa c
      LEFT JOIN coa p ON c.parent_id = p.id
      WHERE c.id = $1`,
      [accountId]
    );

    if (rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Account not found",
      });
    }

    // Get children
    const children = await pool.query(
      "SELECT * FROM coa WHERE parent_id = $1 ORDER BY code",
      [accountId]
    );

    reply.send({
      success: true,
      data: {
        ...rows[0],
        children: children.rows,
      },
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Update COA Account
 */
export async function updateCOA(
  req: FastifyRequest<{
    Params: { id: string };
    Body: {
      code?: string;
      parent_id?: number;
      name?: string;
      type?: "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE";
    };
  }>,
  reply: FastifyReply
) {
  try {
    const accountId = parseInt(req.params.id);
    const { parent_id, ...restData } = req.body;

    // Build update data object
    const updateData: any = { ...restData };

    // Validate parent if being updated
    if (parent_id !== undefined) {
      if (parent_id === accountId) {
        throw new Error("Account cannot be its own parent");
      }
      if (parent_id !== null) {
        const parent = await coaModel.findById(parent_id);
        if (!parent) {
          throw new Error("Parent account not found");
        }
      }
      updateData.parent_id = parent_id;
    }

    updateData.updated_by = (req.user as { id: number }).id;

    const account = await coaModel.update(accountId, updateData);

    reply.send({
      success: true,
      data: account,
      message: "Account updated successfully",
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Delete COA Account
 */
export async function deleteCOA(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const accountId = parseInt(req.params.id);

    // Check if account has children
    const children = await client.query(
      "SELECT COUNT(*) FROM coa WHERE parent_id = $1",
      [accountId]
    );

    if (parseInt(children.rows[0].count) > 0) {
      throw new Error("Cannot delete account with sub-accounts");
    }

    // Check if account is used in journal entries
    const journalLines = await client.query(
      "SELECT COUNT(*) FROM journal_lines WHERE account_id = $1",
      [accountId]
    );

    if (parseInt(journalLines.rows[0].count) > 0) {
      throw new Error("Cannot delete account used in journal entries");
    }

    await coaModel.delete(accountId, client);

    await client.query("COMMIT");

    reply.send({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

/**
 * Get Account Balance
 */
export async function getAccountBalance(
  req: FastifyRequest<{
    Params: { id: string };
    Querystring: {
      from_date?: string;
      to_date?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const accountId = parseInt(req.params.id);
    const { from_date, to_date } = req.query;

    const conditions: string[] = ["account_id = $1"];
    const values: any[] = [accountId];
    let paramIndex = 2;

    if (from_date) {
      conditions.push(`je.entry_date >= $${paramIndex++}`);
      values.push(from_date);
    }

    if (to_date) {
      conditions.push(`je.entry_date <= $${paramIndex++}`);
      values.push(to_date);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const { rows } = await pool.query(
      `SELECT 
        COALESCE(SUM(debit), 0) as total_debit,
        COALESCE(SUM(credit), 0) as total_credit,
        COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as balance
      FROM journal_lines jl
      JOIN journal_entry je ON jl.journal_id = je.id
      ${whereClause}`,
      values
    );

    // Get account details
    const account = await coaModel.findById(accountId);

    reply.send({
      success: true,
      data: {
        account_id: accountId,
        account_name: account?.name,
        account_type: account?.type,
        total_debit: parseFloat(rows[0].total_debit),
        total_credit: parseFloat(rows[0].total_credit),
        balance: parseFloat(rows[0].balance),
        period: {
          from: from_date || "inception",
          to: to_date || "current",
        },
      },
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ===== JOURNAL ENTRY CONTROLLERS =====

/**
 * Create Journal Entry
 */
export async function createJournalEntry(
  req: FastifyRequest<{ Body: CreateJournalBody }>,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { entry_date, reference_type, reference_id, lines } = req.body;

    // Validate lines exist
    if (!lines || lines.length < 2) {
      throw new Error("Journal entry must have at least 2 lines");
    }

    // Validate double-entry
    validateDoubleEntry(lines);

    // Validate all accounts exist
    for (const line of lines) {
      const account = await coaModel.findById(line.account_id, client);
      if (!account) {
        throw new Error(`Account ID ${line.account_id} not found`);
      }
    }

    // Generate journal code
    const code = await generatePrefixedId("journal_entry", "JE");

    // Create journal entry
    const journal = await journalEntryModel.create(
      {
        code,
        entry_date: entry_date || new Date().toISOString().split("T")[0],
        reference_type,
        reference_id,
        created_by: (req.user as { id: number }).id,
      },
      client
    );

    const journalId = journal.id;

    // Insert journal lines
    for (const line of lines) {
      await journalLineModel.create(
        {
          journal_id: journalId,
          account_id: line.account_id,
          debit: line.debit || 0,
          credit: line.credit || 0,
          created_by: (req.user as { id: number }).id,
        },
        client
      );
    }

    await client.query("COMMIT");

    // Fetch complete journal entry
    const completeJournal = await getJournalEntryById(journalId, client);

    reply.send({
      success: true,
      data: completeJournal,
      message: "Journal entry created successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Create journal entry error:", err);
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

/**
 * Get Journal Entry by ID with Lines
 */
export async function getJournalEntryById(journalId: number, client?: any) {
  const queryRunner = client || pool;

  // Get journal entry
  const journalResult = await queryRunner.query(
    "SELECT * FROM journal_entry WHERE id = $1",
    [journalId]
  );

  if (journalResult.rows.length === 0) {
    return null;
  }

  const journal = journalResult.rows[0];

  // Get lines with account details
  const linesResult = await queryRunner.query(
    `SELECT 
      jl.*,
      c.name as account_name,
      c.code as account_code,
      c.type as account_type
    FROM journal_lines jl
    JOIN coa c ON jl.account_id = c.id
    WHERE jl.journal_id = $1
    ORDER BY jl.id`,
    [journalId]
  );

  // Calculate totals
  const totals = linesResult.rows.reduce(
    (acc: { total_debit: number; total_credit: number }, line: any) => ({
      total_debit: acc.total_debit + parseFloat(line.debit || 0),
      total_credit: acc.total_credit + parseFloat(line.credit || 0),
    }),
    { total_debit: 0, total_credit: 0 }
  );

  return {
    ...journal,
    lines: linesResult.rows,
    ...totals,
  };
}

/**
 * Get Single Journal Entry
 */
export async function getJournalEntry(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const journalId = parseInt(req.params.id);
    const journal = await getJournalEntryById(journalId);

    if (!journal) {
      return reply.status(404).send({
        success: false,
        message: "Journal entry not found",
      });
    }

    reply.send({
      success: true,
      data: journal,
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Get All Journal Entries with Filters
 */
export async function getAllJournalEntries(
  req: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      account_id?: string;
      reference_type?: string;
      reference_id?: string;
      from_date?: string;
      to_date?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const {
      page = "1",
      limit = "10",
      account_id,
      reference_type,
      reference_id,
      from_date,
      to_date,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (account_id) {
      conditions.push(
        `je.id IN (SELECT journal_id FROM journal_lines WHERE account_id = $${paramIndex++})`
      );
      values.push(parseInt(account_id));
    }

    if (reference_type) {
      conditions.push(`je.reference_type = $${paramIndex++}`);
      values.push(reference_type);
    }

    if (reference_id) {
      conditions.push(`je.reference_id = $${paramIndex++}`);
      values.push(parseInt(reference_id));
    }

    if (from_date) {
      conditions.push(`je.entry_date >= $${paramIndex++}`);
      values.push(from_date);
    }

    if (to_date) {
      conditions.push(`je.entry_date <= $${paramIndex++}`);
      values.push(to_date);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM journal_entry je ${whereClause}`,
      values
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get journal entries with totals
    const journalsResult = await pool.query(
      `SELECT 
        je.*,
        COALESCE(SUM(jl.debit), 0) as total_debit,
        COALESCE(SUM(jl.credit), 0) as total_credit
      FROM journal_entry je
      LEFT JOIN journal_lines jl ON je.id = jl.journal_id
      ${whereClause}
      GROUP BY je.id
      ORDER BY je.entry_date DESC, je.id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, parseInt(limit), offset]
    );

    reply.send({
      success: true,
      data: journalsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Update Journal Entry
 */
export async function updateJournalEntry(
  req: FastifyRequest<{
    Params: { id: string };
    Body: UpdateJournalBody;
  }>,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const journalId = parseInt(req.params.id);
    const { entry_date, reference_type, reference_id, lines } = req.body;

    // Update journal entry basic info
    const updateData: any = {};
    if (entry_date) updateData.entry_date = entry_date;
    if (reference_type !== undefined)
      updateData.reference_type = reference_type;
    if (reference_id !== undefined) updateData.reference_id = reference_id;
    updateData.updated_by = (req.user as { id: number }).id;

    if (Object.keys(updateData).length > 0) {
      await journalEntryModel.update(journalId, updateData, client);
    }

    // Update lines if provided
    if (lines && lines.length > 0) {
      // Validate double-entry
      validateDoubleEntry(lines);

      // Validate accounts
      for (const line of lines) {
        const account = await coaModel.findById(line.account_id, client);
        if (!account) {
          throw new Error(`Account ID ${line.account_id} not found`);
        }
      }

      // Delete old lines
      await client.query("DELETE FROM journal_lines WHERE journal_id = $1", [
        journalId,
      ]);

      // Insert new lines
      for (const line of lines) {
        await journalLineModel.create(
          {
            journal_id: journalId,
            account_id: line.account_id,
            debit: line.debit || 0,
            credit: line.credit || 0,
            created_by: (req.user as { id: number }).id,
          },
          client
        );
      }
    }

    await client.query("COMMIT");

    const updatedJournal = await getJournalEntryById(journalId, client);

    reply.send({
      success: true,
      data: updatedJournal,
      message: "Journal entry updated successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Update journal entry error:", err);
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

/**
 * Delete Journal Entry
 */
export async function deleteJournalEntry(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const journalId = parseInt(req.params.id);

    // Check if journal exists
    const journal = await getJournalEntryById(journalId, client);
    if (!journal) {
      return reply.status(404).send({
        success: false,
        message: "Journal entry not found",
      });
    }

    // Delete journal (cascade will delete lines)
    await client.query("DELETE FROM journal_entry WHERE id = $1", [journalId]);

    await client.query("COMMIT");

    reply.send({
      success: true,
      message: "Journal entry deleted successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Delete journal entry error:", err);
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

/**
 * Get Account Ledger (Statement)
 */
export async function getAccountLedger(
  req: FastifyRequest<{
    Params: { id: string };
    Querystring: {
      from_date?: string;
      to_date?: string;
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const accountId = parseInt(req.params.id);
    const { from_date, to_date, page = "1", limit = "50" } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = ["jl.account_id = $1"];
    const values: any[] = [accountId];
    let paramIndex = 2;

    if (from_date) {
      conditions.push(`je.entry_date >= $${paramIndex++}`);
      values.push(from_date);
    }

    if (to_date) {
      conditions.push(`je.entry_date <= $${paramIndex++}`);
      values.push(to_date);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Get opening balance (before from_date)
    let openingBalance = 0;
    if (from_date) {
      const openingResult = await pool.query(
        `SELECT 
          COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as opening_balance
        FROM journal_lines jl
        JOIN journal_entry je ON jl.journal_id = je.id
        WHERE jl.account_id = $1 AND je.entry_date < $2`,
        [accountId, from_date]
      );
      openingBalance = parseFloat(openingResult.rows[0].opening_balance);
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM journal_lines jl
       JOIN journal_entry je ON jl.journal_id = je.id
       ${whereClause}`,
      values
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get ledger entries
    const ledgerResult = await pool.query(
      `SELECT 
        je.id as journal_id,
        je.code as journal_code,
        je.entry_date,
        je.reference_type,
        je.reference_id,
        jl.debit,
        jl.credit,
        jl.id as line_id
      FROM journal_lines jl
      JOIN journal_entry je ON jl.journal_id = je.id
      ${whereClause}
      ORDER BY je.entry_date, je.id, jl.id
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, parseInt(limit), offset]
    );

    // Calculate running balance
    let runningBalance = openingBalance;
    const ledgerWithBalance = ledgerResult.rows.map((row) => {
      runningBalance +=
        parseFloat(row.debit || 0) - parseFloat(row.credit || 0);
      return {
        ...row,
        balance: runningBalance,
      };
    });

    // Get account details
    const account = await coaModel.findById(accountId);

    reply.send({
      success: true,
      data: {
        account: {
          id: accountId,
          name: account?.name,
          code: account?.code,
          type: account?.type,
        },
        opening_balance: openingBalance,
        entries: ledgerWithBalance,
        closing_balance: runningBalance,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Get Trial Balance
 */
export async function getTrialBalance(
  req: FastifyRequest<{
    Querystring: {
      as_of_date?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { as_of_date } = req.query;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (as_of_date) {
      conditions.push(`je.entry_date <= $${paramIndex++}`);
      values.push(as_of_date);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT 
        c.id,
        c.code,
        c.name,
        c.type,
        COALESCE(SUM(jl.debit), 0) as total_debit,
        COALESCE(SUM(jl.credit), 0) as total_credit,
        COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) as balance
      FROM coa c
      LEFT JOIN journal_lines jl ON c.id = jl.account_id
      LEFT JOIN journal_entry je ON jl.journal_id = je.id
      ${whereClause}
      GROUP BY c.id, c.code, c.name, c.type
      HAVING COALESCE(SUM(jl.debit), 0) != 0 OR COALESCE(SUM(jl.credit), 0) != 0
      ORDER BY c.type, c.code`,
      values
    );

    // Calculate totals
    const totals = rows.reduce(
      (acc: { total_debit: number; total_credit: number }, row: any) => ({
        total_debit: acc.total_debit + parseFloat(row.total_debit),
        total_credit: acc.total_credit + parseFloat(row.total_credit),
      }),
      { total_debit: 0, total_credit: 0 }
    );

    reply.send({
      success: true,
      data: {
        as_of_date: as_of_date || "current",
        accounts: rows,
        totals,
        is_balanced: totals.total_debit === totals.total_credit,
      },
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ===== EXAMPLE REQUEST BODIES =====
