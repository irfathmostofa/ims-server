import { FastifyRequest, FastifyReply } from "fastify";
import pool from "../../config/db";

export async function DashboardStatastic(
  req: FastifyRequest<{ Body: any }>,
  reply: FastifyReply,
) {
  try {
    const { branchid } = req.body as any;

    // Build WHERE clause based on branchid presence
    const branchFilter = branchid ? "WHERE branch_id = $1" : "";
    const branchValue = branchid ? [branchid] : [];

    // Execute all queries in parallel for better performance
    const [
      totalStockResult,
      branchesResult,
      customersResult,
      staffResult,
      totalSalesResult,
      revenueResult,
      costResult,
      profitResult,
      monthlyRecapResult,
      branchWiseStockResult,
      lowStockResult,
      latestOrdersResult,
      recentProductsResult,
    ] = await Promise.all([
      // Total Stock
      pool.query(
        branchid
          ? `SELECT COALESCE(SUM(quantity), 0) AS total_stock FROM inventory_stock WHERE branch_id = $1`
          : `SELECT COALESCE(SUM(quantity), 0) AS total_stock FROM inventory_stock`,
        branchValue,
      ),

      // Branches (total count)
      pool.query(
        `SELECT COUNT(*) AS total_branches FROM branch WHERE status = 'A'`,
      ),

      // Customers (total active customers)
      pool.query(
        `SELECT COUNT(*) AS total_customers FROM party WHERE type = 'CUSTOMER' AND status = 'A'`,
      ),

      // Staff (total active users)
      pool.query(
        `SELECT COUNT(*) AS total_staff FROM users WHERE status = 'A'`,
      ),

      // Total Sales (number of sales invoices)
      pool.query(
        branchid
          ? `SELECT COUNT(*) AS total_sales FROM invoice WHERE type = 'SALE' AND branch_id = $1`
          : `SELECT COUNT(*) AS total_sales FROM invoice WHERE type = 'SALE'`,
        branchValue,
      ),

      // Total Revenue (sum of paid amounts from sales invoices)
      pool.query(
        branchid
          ? `SELECT COALESCE(SUM(paid_amount), 0) AS total_revenue FROM invoice WHERE type = 'SALE' AND status = 'PAID' AND branch_id = $1`
          : `SELECT COALESCE(SUM(paid_amount), 0) AS total_revenue FROM invoice WHERE type = 'SALE' AND status = 'PAID'`,
        branchValue,
      ),

      // Total Cost (sum of purchase order amounts)
      pool.query(
        branchid
          ? `SELECT COALESCE(SUM(net_amount), 0) AS total_cost FROM purchase_order WHERE status = 'RECEIVED' AND branch_id = $1`
          : `SELECT COALESCE(SUM(net_amount), 0) AS total_cost FROM purchase_order WHERE status = 'RECEIVED'`,
        branchValue,
      ),

      // Total Profit (simplified calculation - revenue from sales minus cost of goods sold)
      pool.query(
        branchid
          ? `SELECT 
               COALESCE((
                 SELECT SUM(i.paid_amount) FROM invoice i 
                 WHERE i.type = 'SALE' AND i.status = 'PAID' AND i.branch_id = $1
               ), 0) - 
               COALESCE((
                 SELECT SUM(po.net_amount) FROM purchase_order po 
                 WHERE po.status = 'RECEIVED' AND po.branch_id = $1
               ), 0) AS total_profit`
          : `SELECT 
               COALESCE((
                 SELECT SUM(paid_amount) FROM invoice WHERE type = 'SALE' AND status = 'PAID'
               ), 0) - 
               COALESCE((
                 SELECT SUM(net_amount) FROM purchase_order WHERE status = 'RECEIVED'
               ), 0) AS total_profit`,
        branchValue,
      ),

      // Monthly Recap Report (last 12 months)
      pool.query(
        branchid
          ? `SELECT 
               TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
               COUNT(CASE WHEN type = 'SALE' THEN 1 END) AS total_orders,
               SUM(CASE WHEN type = 'SALE' AND status = 'PAID' THEN paid_amount ELSE 0 END) AS revenue,
               SUM(CASE WHEN type = 'PURCHASE' AND status = 'PAID' THEN paid_amount ELSE 0 END) AS purchases,
               COUNT(DISTINCT party_id) AS unique_customers
             FROM invoice 
             WHERE created_at >= NOW() - INTERVAL '12 months'
               AND branch_id = $1
             GROUP BY DATE_TRUNC('month', created_at)
             ORDER BY month DESC`
          : `SELECT 
               TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
               COUNT(CASE WHEN type = 'SALE' THEN 1 END) AS total_orders,
               SUM(CASE WHEN type = 'SALE' AND status = 'PAID' THEN paid_amount ELSE 0 END) AS revenue,
               SUM(CASE WHEN type = 'PURCHASE' AND status = 'PAID' THEN paid_amount ELSE 0 END) AS purchases,
               COUNT(DISTINCT party_id) AS unique_customers
             FROM invoice 
             WHERE created_at >= NOW() - INTERVAL '12 months'
             GROUP BY DATE_TRUNC('month', created_at)
             ORDER BY month DESC`,
        branchValue,
      ),

      // Branch-wise Stock (only if no branch filter)
      pool.query(`
            SELECT 
              b.id,
              b.name AS branch_name,
              COUNT(DISTINCT is2.product_variant_id) AS unique_products,
              COALESCE(SUM(is2.quantity), 0) AS total_items,
              COALESCE(SUM(is2.quantity * p.cost_price), 0) AS stock_value
            FROM branch b
            LEFT JOIN inventory_stock is2 ON b.id = is2.branch_id
            LEFT JOIN product_variant pv ON is2.product_variant_id = pv.id
            LEFT JOIN product p ON pv.product_id = p.id
            WHERE b.status = 'A'
            GROUP BY b.id, b.name
            ORDER BY total_items DESC
          `),

      // Low Stock Products (quantity < 10)
      pool.query(
        branchid
          ? `SELECT 
               pv.id AS variant_id,
               p.name AS product_name,
               pv.name AS variant_name,
               pv.sku,
               is2.quantity,
               p.selling_price,
               p.cost_price
             FROM inventory_stock is2
             JOIN product_variant pv ON is2.product_variant_id = pv.id
             JOIN product p ON pv.product_id = p.id
             WHERE is2.branch_id = $1 
               AND is2.quantity < 10
               AND is2.quantity > 0
             ORDER BY is2.quantity ASC
             LIMIT 20`
          : `SELECT 
               pv.id AS variant_id,
               p.name AS product_name,
               pv.name AS variant_name,
               pv.sku,
               SUM(is2.quantity) AS total_quantity,
               p.selling_price,
               p.cost_price
             FROM inventory_stock is2
             JOIN product_variant pv ON is2.product_variant_id = pv.id
             JOIN product p ON pv.product_id = p.id
             WHERE is2.quantity < 10
               AND is2.quantity > 0
             GROUP BY pv.id, pv.name, pv.sku, p.name, p.selling_price, p.cost_price
             ORDER BY total_quantity ASC
             LIMIT 20`,
        branchValue,
      ),

      // Latest Orders last 5
      pool.query(
        branchid
          ? `SELECT 
               i.id,
               i.code AS invoice_number,
               i.invoice_date,
               p.name AS party_name,
               i.total_amount,
               i.status,
               i.paid_amount,
               i.due_amount,
               u.username AS created_by
             FROM invoice i
             LEFT JOIN party p ON i.party_id = p.id
             LEFT JOIN users u ON i.created_by = u.id
             WHERE i.type = 'SALE' 
               AND i.branch_id = $1
             ORDER BY i.created_at DESC
             LIMIT 5`
          : `SELECT 
               i.id,
               i.code AS invoice_number,
               i.invoice_date,
               p.name AS party_name,
               i.total_amount,
               i.status,
               i.paid_amount,
               i.due_amount,
               u.username AS created_by,
               b.name AS branch_name
             FROM invoice i
             LEFT JOIN party p ON i.party_id = p.id
             LEFT JOIN users u ON i.created_by = u.id
             LEFT JOIN branch b ON i.branch_id = b.id
             WHERE i.type = 'SALE'
             ORDER BY i.created_at DESC
             LIMIT 5`,
        branchValue,
      ),

      // Recently Added Products last 5
      pool.query(
        `SELECT 
           p.id,
           p.code,
           p.name AS product_name,
           p.slug,
           p.selling_price,
           p.cost_price,
           u.username AS created_by,
           p.created_at,
           (SELECT url FROM product_image pi 
            JOIN product_variant pv ON pi.product_variant_id = pv.id 
            WHERE pv.product_id = p.id AND pi.is_primary = true 
            LIMIT 1) AS primary_image
         FROM product p
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.status = 'A'
         ORDER BY p.created_at DESC
         LIMIT 5`,
      ),
    ]);

    // Process the results
    const dashboardData = {
      success: true,
      data: {
        // Summary Cards
        summary: {
          totalStock: parseInt(totalStockResult.rows[0]?.total_stock) || 0,
          totalBranches: parseInt(branchesResult.rows[0]?.total_branches) || 0,
          totalCustomers:
            parseInt(customersResult.rows[0]?.total_customers) || 0,
          totalStaff: parseInt(staffResult.rows[0]?.total_staff) || 0,
          totalSales: parseInt(totalSalesResult.rows[0]?.total_sales) || 0,
          totalRevenue: parseFloat(revenueResult.rows[0]?.total_revenue) || 0,
          totalCost: parseFloat(costResult.rows[0]?.total_cost) || 0,
          totalProfit: parseFloat(profitResult.rows[0]?.total_profit) || 0,
        },

        // Monthly Recap for Charts
        monthlyRecap: monthlyRecapResult.rows.map((row) => ({
          month: row.month,
          orders: parseInt(row.total_orders) || 0,
          revenue: parseFloat(row.revenue) || 0,
          purchases: parseFloat(row.purchases) || 0,
          uniqueCustomers: parseInt(row.unique_customers) || 0,
        })),

        // Branch-wise Stock (if no branch filter)
        branchWiseStock: branchWiseStockResult.rows.map((row) => ({
          branchId: row.id,
          branchName: row.branch_name,
          uniqueProducts: parseInt(row.unique_products) || 0,
          totalItems: parseFloat(row.total_items) || 0,
          stockValue: parseFloat(row.stock_value) || 0,
        })),

        // Low Stock Products
        lowStockProducts: lowStockResult.rows.map((row) => ({
          variantId: row.variant_id,
          productName: row.product_name,
          variantName: row.variant_name || "Default",
          sku: row.sku,
          quantity: parseFloat(row.quantity || row.total_quantity) || 0,
          sellingPrice: parseFloat(row.selling_price) || 0,
          costPrice: parseFloat(row.cost_price) || 0,
          potentialProfit:
            (parseFloat(row.selling_price) || 0) -
            (parseFloat(row.cost_price) || 0),
        })),

        // Latest Orders
        latestOrders: latestOrdersResult.rows.map((row) => ({
          id: row.id,
          invoiceNumber: row.invoice_number,
          date: row.invoice_date,
          partyName: row.party_name || "Walk-in Customer",
          amount: parseFloat(row.total_amount) || 0,
          status: row.status,
          paidAmount: parseFloat(row.paid_amount) || 0,
          dueAmount: parseFloat(row.due_amount) || 0,
          createdBy: row.created_by,
          branchName: row.branch_name,
        })),

        // Recently Added Products
        recentlyAddedProducts: recentProductsResult.rows.map((row) => ({
          id: row.id,
          code: row.code,
          name: row.product_name,
          slug: row.slug,
          sellingPrice: parseFloat(row.selling_price) || 0,
          costPrice: parseFloat(row.cost_price) || 0,
          createdBy: row.created_by,
          createdAt: row.created_at,
          //   image: row.primary_image || null,
        })),
      },
      meta: {
        branchFilter: branchid || "all",
        timestamp: new Date().toISOString(),
      },
    };

    reply.status(200).send(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
    reply.status(500).send({
      success: false,
      error: "Internal Server Error",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
