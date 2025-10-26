import pool from "../../config/db";

/**
 * Approve Requisition and Process Stock Transfer
 * This function:
 * 1. Approves the requisition
 * 2. Creates a product transfer
 * 3. Deducts stock from source branch
 * 4. Adds stock to destination branch
 * 5. Creates stock transactions for audit trail
 */

/**
 * Helper: Get Transfer by ID with details
 */
export async function getTransferByIdHelper(transferId: number, client?: any) {
  const queryRunner = client || pool;

  const transferResult = await queryRunner.query(
    `SELECT 
      pt.*,
      fb.name as from_branch_name,
      tb.name as to_branch_name
    FROM product_transfer pt
    LEFT JOIN branch fb ON pt.from_branch_id = fb.id
    LEFT JOIN branch tb ON pt.to_branch_id = tb.id
    WHERE pt.id = $1`,
    [transferId]
  );

  if (transferResult.rows.length === 0) return null;

  const transfer = transferResult.rows[0];

  const itemsResult = await queryRunner.query(
    `SELECT 
      pti.*,
      pv.name as variant_name,
      pv.code as variant_code,
      p.name as product_name
    FROM product_transfer_items pti
    JOIN product_variant pv ON pti.product_variant_id = pv.id
    JOIN product p ON pv.product_id = p.id
    WHERE pti.transfer_id = $1`,
    [transferId]
  );

  return {
    ...transfer,
    items: itemsResult.rows,
  };
}

/**
 * Helper: Get Requisition by ID (reusable)
 */
export async function getRequisitionByIdHelper(
  requisitionId: number,
  client?: any
) {
  const queryRunner = client || pool;

  const requisitionResult = await queryRunner.query(
    `SELECT 
      r.*,
      fb.name as from_branch_name,
      tb.name as to_branch_name,
      u.username as created_by_name
    FROM requisition r
    LEFT JOIN branch fb ON r.from_branch_id = fb.id
    LEFT JOIN branch tb ON r.to_branch_id = tb.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.id = $1`,
    [requisitionId]
  );

  if (requisitionResult.rows.length === 0) return null;

  const requisition = requisitionResult.rows[0];

  const itemsResult = await queryRunner.query(
    `SELECT 
      ri.*,
      pv.name as variant_name,
      pv.code as variant_code,
      p.name as product_name
    FROM requisition_items ri
    JOIN product_variant pv ON ri.product_variant_id = pv.id
    JOIN product p ON pv.product_id = p.id
    WHERE ri.requisition_id = $1`,
    [requisitionId]
  );

  return {
    ...requisition,
    items: itemsResult.rows,
  };
}
