// controllers/PaymentController.ts
import { FastifyRequest, FastifyReply } from "fastify";
import pool from "../../config/db";

// Types
interface InitiatePaymentBody {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  productName: string;
  productCategory?: string;
}

interface CallbackBody {
  tran_id: string;
  status: string;
  val_id: string;
  amount: string;
  currency: string;
  bank_tran_id?: string;
  card_type?: string;
  card_no?: string;
  card_issuer?: string;
  [key: string]: any; // For other SSLCommerz fields
}

// Helper function to make HTTP requests
async function makeRequest(
  url: string,
  data: Record<string, any>,
  method: "POST" | "GET" = "POST",
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    let options: RequestInit = {
      method,
      signal: controller.signal,
    };

    if (method === "POST") {
      const formData = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      options.body = formData.toString();
      options.headers = {
        "Content-Type": "application/x-www-form-urlencoded",
      };
    }

    const response = await fetch(url, options);
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// Main controller functions
export async function initiatePayment(
  req: FastifyRequest<{ Body: InitiatePaymentBody }>,
  reply: FastifyReply,
) {
  const client = await pool.connect();

  try {
    const {
      orderId,
      amount,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress = "Dhaka",
      productName,
      productCategory = "General",
    } = req.body;

    // Validate input
    if (
      !orderId ||
      !amount ||
      !customerName ||
      !customerEmail ||
      !customerPhone
    ) {
      return reply.status(400).send({
        success: false,
        message: "Missing required fields",
      });
    }

    if (amount < 10 || amount > 500000) {
      return reply.status(400).send({
        success: false,
        message: "Amount must be between 10 and 500,000",
      });
    }

    // Verify order exists and is valid
    const orderResult = await client.query(
      `SELECT id, net_amount, payment_status 
       FROM order_online 
       WHERE code = $1 AND status = 'A'`,
      [orderId],
    );

    if (orderResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    const order = orderResult.rows[0];

    // Check if order amount matches
    if (parseFloat(order.net_amount) !== amount) {
      return reply.status(400).send({
        success: false,
        message: "Amount does not match order total",
      });
    }

    // Check if order is already paid
    if (order.payment_status === "PAID") {
      return reply.status(400).send({
        success: false,
        message: "Order is already paid",
      });
    }

    // Fetch payment configuration from database
    const configResult = await client.query(
      `SELECT * FROM setup_data WHERE key_name='payment'`,
    );

    if (!configResult.rows.length) {
      return reply.status(500).send({
        success: false,
        message: "Payment configuration not found",
      });
    }

    // Parse the payment configuration
    const paymentConfig = JSON.parse(configResult.rows[0].value);

    // Check if online payment is enabled
    if (!paymentConfig.online_payment?.status) {
      return reply.status(400).send({
        success: false,
        message: "Online payment is disabled",
      });
    }

    // Find SSLCommerz gateway configuration
    const sslGateway = paymentConfig.online_payment.gateways?.find(
      (gateway: any) =>
        gateway.name === "SSLCommerz" && gateway.status === true,
    );

    if (!sslGateway) {
      return reply.status(500).send({
        success: false,
        message: "SSLCommerz gateway not configured or disabled",
      });
    }

    // Determine which URL to use based on environment
    const baseUrl =
      sslGateway.environment === "live"
        ? "https://securepay.sslcommerz.com"
        : sslGateway.sandbox_url || "https://sandbox.sslcommerz.com";

    // Generate unique transaction ID
    const tranId = `TXN_${orderId}_${Date.now()}`;

    // Prepare SSLCommerz request data
    const sslData = {
      store_id: sslGateway.store_id,
      store_passwd: sslGateway.store_password,
      total_amount: amount.toFixed(2),
      currency: "BDT",
      tran_id: tranId,

      // Customer info
      cus_name: customerName,
      cus_email: customerEmail,
      cus_phone: customerPhone,
      cus_add1: customerAddress,
      cus_city: "Dhaka",
      cus_country: "Bangladesh",

      // Product info
      product_name: productName || "General Product",
      product_category: productCategory,
      product_profile: "general",

      // Callback URLs
      success_url: `${process.env.BASE_URL}/api/payments/callback?type=success&tran_id=${tranId}`,
      fail_url: `${process.env.BASE_URL}/api/payments/callback?type=fail&tran_id=${tranId}`,
      cancel_url: `${process.env.BASE_URL}/api/payments/callback?type=cancel&tran_id=${tranId}`,
      ipn_url: `${process.env.BASE_URL}/api/payments/callback?type=ipn`,

      // Additional fields
      value_a: orderId,
      value_b: customerEmail,
    };

    // Call SSLCommerz API
    const sslResponse = await makeRequest(
      `${baseUrl}/gwprocess/v4/api.php`,
      sslData,
      "POST",
    );

    if (sslResponse.status !== "SUCCESS") {
      return reply.status(400).send({
        success: false,
        message: sslResponse.failedreason || "Payment initiation failed",
      });
    }

    // Insert payment record
    const paymentMethodResult = await client.query(
      `SELECT * FROM payment_method WHERE provider = 'SSLCOMMERZ' AND status = 'A'`,
    );

    let paymentMethodId = paymentMethodResult.rows[0]?.id;

    await client.query(
      `INSERT INTO order_payment_online (
        order_id, 
        payment_method_id, 
        transaction_id, 
        amount, 
        status, 
        created_at
      ) VALUES ($1, $2, $3, $4, 'PENDING', NOW())`,
      [order.id, paymentMethodId, tranId, amount],
    );

    // Return payment URL to redirect user
    return reply.send({
      success: true,
      message: "Payment initiated",
      data: {
        paymentUrl: sslResponse.GatewayPageURL,
        transactionId: tranId,
        amount: amount,
        orderId: orderId,
      },
    });
  } catch (error: any) {
    console.error("Initiate payment error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to initiate payment",
      error: error.message,
    });
  } finally {
    client.release();
  }
}
export async function initiatePaymentAfterOrder(
  orderData: {
    orderId: string;
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    productName: string;
  },
  client: any,
) {
  try {
    // Fetch payment configuration from database
    const configResult = await client.query(
      `SELECT * FROM setup_data WHERE key_name='payment'`,
    );

    if (!configResult.rows.length) {
      throw new Error("Payment configuration not found");
    }

    // Parse the payment configuration
    const paymentConfig = JSON.parse(configResult.rows[0].value);

    // Check if online payment is enabled
    if (!paymentConfig.online_payment?.status) {
      throw new Error("Online payment is disabled");
    }

    // Find SSLCommerz gateway configuration
    const sslGateway = paymentConfig.online_payment.gateways?.find(
      (gateway: any) =>
        gateway.name === "SSLCommerz" && gateway.status === true,
    );

    if (!sslGateway) {
      throw new Error("SSLCommerz gateway not configured or disabled");
    }

    // Determine which URL to use based on environment
    const baseUrl =
      sslGateway.environment === "live"
        ? "https://securepay.sslcommerz.com"
        : sslGateway.sandbox_url || "https://sandbox.sslcommerz.com";

    // Generate unique transaction ID
    const tranId = `TXN_${orderData.orderId}_${Date.now()}`;

    // Prepare SSLCommerz request data
    const sslData = {
      store_id: sslGateway.store_id,
      store_passwd: sslGateway.store_password,
      total_amount: orderData.amount.toFixed(2),
      currency: "BDT",
      tran_id: tranId,

      // Customer info
      cus_name: orderData.customerName,
      cus_email: orderData.customerEmail,
      cus_phone: orderData.customerPhone,
      cus_add1: orderData.customerAddress,
      cus_city: "Dhaka",
      cus_country: "Bangladesh",

      // Product info
      product_name: orderData.productName,
      product_category: "General",
      product_profile: "general",

      // Callback URLs
      success_url: `${process.env.SERVER_URL}/payments/callback?type=success&tran_id=${tranId}`,
      fail_url: `${process.env.SERVER_URL}/payments/callback?type=fail&tran_id=${tranId}`,
      cancel_url: `${process.env.SERVER_URL}/payments/callback?type=cancel&tran_id=${tranId}`,
      ipn_url: `${process.env.SERVER_URL}/payments/callback?type=ipn`,

      // Additional fields
      value_a: orderData.orderId,
      value_b: orderData.customerEmail,
    };

    // Call SSLCommerz API
    const sslResponse = await makeRequest(
      `${baseUrl}/gwprocess/v4/api.php`,
      sslData,
      "POST",
    );

    if (sslResponse.status !== "SUCCESS") {
      throw new Error(sslResponse.failedreason || "Payment initiation failed");
    }

    // Insert payment record
    const paymentMethodResult = await client.query(
      `SELECT * FROM payment_method WHERE code = 'SSLCOMMERZ' AND status = 'A'`,
    );

    let paymentMethodId = paymentMethodResult.rows[0]?.id;

    // Get order ID from code
    const orderResult = await client.query(
      `SELECT id FROM order_online WHERE code = $1`,
      [orderData.orderId],
    );

    await client.query(
      `INSERT INTO order_payment_online (
        order_id, 
        payment_method_id, 
        transaction_id, 
        amount, 
        status, 
        created_at
      ) VALUES ($1, $2, $3, $4, 'PENDING', NOW())`,
      [orderResult.rows[0].id, paymentMethodId, tranId, orderData.amount],
    );

    return {
      paymentUrl: sslResponse.GatewayPageURL,
      transactionId: tranId,
      amount: orderData.amount,
    };
  } catch (error: any) {
    console.error("Payment initiation error:", error);
    throw new Error(`Payment initiation failed: ${error.message}`);
  }
}

// Update the route to handle both GET and POST
export async function callback(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { type, tran_id } = req.query as { type: string; tran_id: string };
    const body = req.body as CallbackBody;

    // Handle different callback types
    switch (type) {
      case "ipn": // Server-to-server notification
        return await handleIPN(body, reply);

      case "success": // Customer success redirect
        return await handleSuccess(tran_id, reply);

      case "fail": // Customer failure redirect
        return await handleFailure(tran_id, reply);

      case "cancel": // Customer cancel redirect
        return await handleCancel(tran_id, reply);

      default:
        return reply.status(400).send({
          success: false,
          message: "Invalid callback type",
        });
    }
  } catch (error: any) {
    console.error("Callback error:", error);
    return reply.status(500).send({
      success: false,
      message: "Callback processing failed",
      error: error.message,
    });
  }
}

// Helper functions for callback handling
async function handleIPN(ipnData: CallbackBody, reply: FastifyReply) {
  console.log("IPN Data received:", ipnData);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch payment configuration from database
    const configResult = await client.query(
      `SELECT * FROM setup_data WHERE key_name='payment'`,
    );

    if (!configResult.rows.length) {
      throw new Error("Payment configuration not found");
    }

    const paymentConfig = JSON.parse(configResult.rows[0].value);

    // Find SSLCommerz gateway configuration
    const sslGateway = paymentConfig.online_payment.gateways?.find(
      (gateway: any) =>
        gateway.name === "SSLCommerz" && gateway.status === true,
    );

    if (!sslGateway) {
      throw new Error("SSLCommerz gateway not configured");
    }

    // Determine base URL for validation
    const baseUrl =
      sslGateway.environment === "live"
        ? "https://securepay.sslcommerz.com"
        : sslGateway.sandbox_url || "https://sandbox.sslcommerz.com";

    // 1. Validate transaction with SSLCommerz (MANDATORY)
    const validationResponse = await makeRequest(
      `${baseUrl}/validator/api/validationserverAPI.php?` +
        `val_id=${ipnData.val_id}&` +
        `store_id=${sslGateway.store_id}&` +
        `store_passwd=${sslGateway.store_password}&` +
        `format=json`,
      {},
      "GET",
    );

    console.log("SSLCommerz validation response:", validationResponse);

    // 2. Check if validation is successful
    if (
      validationResponse.status !== "VALID" &&
      validationResponse.status !== "VALIDATED"
    ) {
      throw new Error(
        `Transaction validation failed with status: ${validationResponse.status}`,
      );
    }

    // Extract orderId from tran_id (format: TXN_ORDER-12345_1678901234567)
    const orderCode = ipnData.value_a || ipnData.tran_id.split("_")[1];

    // 3. Get the order by code
    const orderResult = await client.query(
      `SELECT id FROM order_online WHERE code = $1 AND status = 'A'`,
      [orderCode],
    );

    if (orderResult.rows.length === 0) {
      throw new Error(`Order not found with code: ${orderCode}`);
    }

    const orderId = orderResult.rows[0].id;

    // 4. Check if payment record already exists
    const existingPayment = await client.query(
      `SELECT id FROM order_payment_online WHERE transaction_id = $1`,
      [ipnData.tran_id],
    );

    if (existingPayment.rows.length > 0) {
      // Update existing payment record
      await client.query(
        `UPDATE order_payment_online 
         SET status = 'SUCCESS', 
             provider_response = $1,
             paid_at = NOW(),
             updated_at = NOW()
         WHERE transaction_id = $2`,
        [validationResponse, ipnData.tran_id],
      );
    } else {
      // Insert new payment record
      // Get payment_method_id for SSLCommerz
      const paymentMethodResult = await client.query(
        `SELECT id FROM payment_method WHERE code = 'SSLCOMMERZ' AND status = 'A'`,
      );

      let paymentMethodId = paymentMethodResult.rows[0]?.id;

      if (!paymentMethodId) {
        // Insert payment method if not exists
        const newPaymentMethod = await client.query(
          `INSERT INTO payment_method (name, code, status, created_at) 
           VALUES ('SSLCommerz', 'SSLCOMMERZ', 'A', NOW()) 
           RETURNING id`,
        );
        paymentMethodId = newPaymentMethod.rows[0].id;
      }

      await client.query(
        `INSERT INTO order_payment_online (
          order_id, 
          payment_method_id, 
          transaction_id, 
          amount, 
          status, 
          provider_response, 
          paid_at,
          created_at
        ) VALUES ($1, $2, $3, $4, 'SUCCESS', $5, NOW(), NOW())`,
        [
          orderId,
          paymentMethodId,
          ipnData.tran_id,
          validationResponse.amount || ipnData.amount,
          validationResponse,
        ],
      );
    }

    // 5. Update order payment status to PAID
    await client.query(
      `UPDATE order_online 
       SET payment_status = 'PAID',
           order_status = 'CONFIRMED',
           updated_at = NOW()
       WHERE id = $1`,
      [orderId],
    );

    await client.query("COMMIT");

    console.log(
      `Transaction ${ipnData.tran_id} successfully processed for order ${orderCode}`,
    );

    // Return success to SSLCommerz
    return reply.status(200).send({
      status: "success",
      message: "IPN received and processed successfully",
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("IPN validation error:", error);
    // Still return 200 to prevent SSLCommerz retries
    return reply.status(200).send({
      status: "error",
      message: "IPN received with issues: " + error.message,
    });
  } finally {
    client.release();
  }
}

async function handleSuccess(tranId: string, reply: FastifyReply) {
  console.log("Success callback for transaction:", tranId);

  try {
    // Get transaction details from database
    const paymentResult = await pool.query(
      `SELECT op.*, o.code as order_code 
       FROM order_payment_online op
       JOIN order_online o ON op.order_id = o.id
       WHERE op.transaction_id = $1`,
      [tranId],
    );

    if (paymentResult.rows.length === 0) {
      console.error(`Transaction ${tranId} not found in database`);
      return reply.redirect(
        `${process.env.FRONTEND_URL}/payment/error?reason=transaction_not_found`,
      );
    }

    const payment = paymentResult.rows[0];

    // If payment is already SUCCESS, redirect to success page
    if (payment.status === "SUCCESS") {
      return reply.redirect(
        `${process.env.FRONTEND_URL}/payment/success?order_id=${payment.order_code}`,
      );
    }
    // If payment is still PENDING, show processing page
    else if (payment.status === "PENDING") {
      return reply.redirect(
        `${process.env.FRONTEND_URL}/payment/processing?order_id=${payment.order_code}`,
      );
    }
    // Otherwise, show error
    else {
      return reply.redirect(
        `${process.env.FRONTEND_URL}/payment/error?order_id=${payment.order_code}&reason=invalid_status`,
      );
    }
  } catch (error: any) {
    console.error("Error in success handler:", error);
    return reply.redirect(
      `${process.env.FRONTEND_URL}/payment/error?reason=callback_error`,
    );
  }
}

async function handleFailure(tranId: string, reply: FastifyReply) {
  console.log("Failure callback for transaction:", tranId);

  try {
    // Update transaction status in database
    const result = await pool.query(
      `UPDATE order_payment_online 
       SET status = 'FAILED', 
           updated_at = NOW()
       WHERE transaction_id = $1
       RETURNING order_id`,
      [tranId],
    );

    let orderCode = "";
    if (result.rows.length > 0) {
      // Get order code
      const orderResult = await pool.query(
        `SELECT code FROM order_online WHERE id = $1`,
        [result.rows[0].order_id],
      );
      orderCode = orderResult.rows[0]?.code || "";
    }

    return reply.redirect(
      `${process.env.FRONTEND_URL}/payment/failed?order_id=${orderCode}&reason=payment_failed`,
    );
  } catch (error: any) {
    console.error("Error in failure handler:", error);
    return reply.redirect(
      `${process.env.FRONTEND_URL}/payment/failed?reason=callback_error`,
    );
  }
}

async function handleCancel(tranId: string, reply: FastifyReply) {
  console.log("Cancel callback for transaction:", tranId);

  try {
    // Delete or mark as cancelled in database
    const result = await pool.query(
      `UPDATE order_payment_online 
       SET status = 'FAILED', 
           updated_at = NOW()
       WHERE transaction_id = $1
       RETURNING order_id`,
      [tranId],
    );

    let orderCode = "";
    if (result.rows.length > 0) {
      const orderResult = await pool.query(
        `SELECT code FROM order_online WHERE id = $1`,
        [result.rows[0].order_id],
      );
      orderCode = orderResult.rows[0]?.code || "";
    }

    return reply.redirect(
      `${process.env.FRONTEND_URL}/payment/cancelled?order_id=${orderCode}`,
    );
  } catch (error: any) {
    console.error("Error in cancel handler:", error);
    return reply.redirect(
      `${process.env.FRONTEND_URL}/payment/cancelled?reason=callback_error`,
    );
  }
}

// Update the initiatePayment function to work with your tables
