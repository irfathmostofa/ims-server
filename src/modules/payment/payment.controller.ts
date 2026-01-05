// controllers/PaymentController.ts
import { FastifyRequest, FastifyReply } from "fastify";

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

// SSLCommerz Configuration
const SSL_CONFIG = {
  isLive: process.env.NODE_ENV === "production",
  storeId: process.env.SSLCOMMERZ_STORE_ID!,
  storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD!,
  baseUrl:
    process.env.NODE_ENV === "production"
      ? "https://securepay.sslcommerz.com"
      : "https://sandbox.sslcommerz.com",
};

// Helper function to make HTTP requests
async function makeRequest(
  url: string,
  data: Record<string, any>,
  method: "POST" | "GET" = "POST"
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
  reply: FastifyReply
) {
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

    // Generate unique transaction ID
    const tranId = `TXN_${orderId}_${Date.now()}`;

    // Prepare SSLCommerz request data
    const sslData = {
      store_id: SSL_CONFIG.storeId,
      store_passwd: SSL_CONFIG.storePassword,
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
      product_name: productName,
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
      `${SSL_CONFIG.baseUrl}/gwprocess/v4/api.php`,
      sslData,
      "POST"
    );

    if (sslResponse.status !== "SUCCESS") {
      return reply.status(400).send({
        success: false,
        message: sslResponse.failedreason || "Payment initiation failed",
      });
    }

    // Save transaction to your database (implement your own logic)
    console.log("Saving transaction:", {
      orderId,
      tranId,
      amount,
      customerEmail,
      status: "PENDING",
    });

    // Return payment URL to redirect user
    return reply.send({
      success: true,
      message: "Payment initiated",
      data: {
        paymentUrl: sslResponse.GatewayPageURL,
        transactionId: tranId,
        amount: amount,
      },
    });
  } catch (error: any) {
    console.error("Initiate payment error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to initiate payment",
      error: error.message,
    });
  }
}

export async function callback(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { type, tran_id } = req.query as { type: string; tran_id: string };
    const body = req.body as CallbackBody;

    console.log("Callback received:", { type, tran_id });

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

  // 1. Validate transaction with SSLCommerz (MANDATORY)
  try {
    const validationResponse = await makeRequest(
      `${SSL_CONFIG.baseUrl}/validator/api/validationserverAPI.php?` +
        `val_id=${ipnData.val_id}&` +
        `store_id=${SSL_CONFIG.storeId}&` +
        `store_passwd=${SSL_CONFIG.storePassword}&` +
        `format=json&v=1`,
      {},
      "GET"
    );

    // 2. Check if validation is successful
    if (validationResponse.APIConnect !== "DONE") {
      throw new Error("SSLCommerz validation failed");
    }

    // 3. Check transaction status
    if (!["VALID", "VALIDATED"].includes(validationResponse.status)) {
      throw new Error(`Transaction is ${validationResponse.status}`);
    }

    // 4. Update your database (implement your own logic)
    console.log("Updating transaction in database:", {
      transactionId: ipnData.tran_id,
      status: validationResponse.status,
      amount: validationResponse.amount,
      validated: true,
    });

    // 5. Update order status to PAID
    console.log(
      "Updating order status to PAID for transaction:",
      ipnData.tran_id
    );

    // 6. Return success to SSLCommerz
    return reply.send("IPN received and processed");
  } catch (error: any) {
    console.error("IPN validation error:", error);
    // Still return 200 to prevent SSLCommerz retries
    return reply.send("IPN received with issues");
  }
}

async function handleSuccess(tranId: string, reply: FastifyReply) {
  console.log("Success callback for transaction:", tranId);

  // Check transaction status from your database
  // (Implement your own database logic)
  const transactionStatus = "PAID"; // This should come from your database

  if (transactionStatus === "PAID") {
    return reply.redirect("/payment-success.html");
  } else {
    return reply.redirect("/payment-processing.html");
  }
}

async function handleFailure(tranId: string, reply: FastifyReply) {
  console.log("Failure callback for transaction:", tranId);

  // Update transaction status in your database
  console.log("Updating transaction status to FAILED:", tranId);

  return reply.redirect("/payment-failed.html");
}

async function handleCancel(tranId: string, reply: FastifyReply) {
  console.log("Cancel callback for transaction:", tranId);

  // Update transaction status in your database
  console.log("Updating transaction status to CANCELLED:", tranId);

  return reply.redirect("/payment-cancelled.html");
}
