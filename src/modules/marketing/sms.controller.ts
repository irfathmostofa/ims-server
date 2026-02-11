// controllers/sms.controller.ts
import { FastifyReply, FastifyRequest } from "fastify";
import SMSService from "../../core/services/smsService";

// Types
interface SMSRequestBody {
  mode?: "single" | "bulk";
  phone?: string;
  phones?: string[];
  phone_numbers?: string;
  message?: string;
  template?: string;
  message_id?: string;
  party_id?: string;
  category?: "otp" | "offer" | "warning" | "alert" | "general";
  encoding?: "url" | "plain";
  offer_title?: string;
  offer_details?: string;
  expiry_date?: string;
  warning_title?: string;
  warning_details?: string;
  urgency?: "low" | "medium" | "high";
  transaction_type?: string;
  amount?: number;
  reference?: string;
  balance?: number;
  otp?: string;
  recipients?: Array<{ phoneNumber: string; message?: string }>;
  name?: string;
  variables?: Record<string, any>;
}

interface TemplateRequestBody {
  name: string;
  template?: string;
  variables?: string[];
  category?: "otp" | "offer" | "warning" | "alert" | "general" | "custom";
  example?: string;
}

interface TemplateParams {
  name: string;
}

// Initialize SMS Service
const initializeSMSService = () => {
  return new SMSService({
    apiKey: process.env.SMS_API_KEY || "8mqF9BTFnPgkNSl3WY86",
    senderId: process.env.SMS_SENDER_ID || "YourBrand",
    baseUrl: process.env.SMS_API_URL || "http://bulksmsbd.net/api/smsapi",
  });
};

const smsService = initializeSMSService();

/**
 * Health Check
 */
export async function healthCheck(req: FastifyRequest, reply: FastifyReply) {
  try {
    return reply.send({
      success: true,
      message: "SMS Service is operational",
      timestamp: new Date().toISOString(),
      service: "sms",
      version: "1.0.0",
    });
  } catch (error: any) {
    return reply.status(503).send({
      success: false,
      message: "SMS Service is unavailable",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Send SMS with dynamic options
 */
export async function sendSMS(req: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      mode,
      phone,
      phones,
      phone_numbers,
      message,
      message_id,
      party_id,
      category = "general",
      encoding = "url",
      ...rest
    } = req.body as SMSRequestBody;

    // Validate required fields
    if (!message) {
      return reply.status(400).send({
        success: false,
        message: "Message content is required",
        error: "NO_MESSAGE",
        code: 4001,
      });
    }

    // Determine recipients
    let recipients: string | Array<{ phoneNumber: string; message?: string }>;

    if (phone) {
      recipients = phone;
    } else if (phones && Array.isArray(phones)) {
      recipients = phones.join(",");
    } else if (phone_numbers) {
      recipients = phone_numbers;
    } else {
      return reply.status(400).send({
        success: false,
        message: "At least one recipient phone number is required",
        error: "NO_RECIPIENTS",
        code: 4002,
      });
    }

    // Prepare options
    const options = {
      recipients,
      message,
      type: mode,
      category,
      encoding,
      ...rest,
    };

    // Send SMS
    const result = await smsService.sendSMS(options);

    // Prepare response
    const response = {
      ...result,
      metadata: {
        request_id: message_id || `sms_${Date.now()}`,
        party_id: party_id || null,
        timestamp: new Date().toISOString(),
        category,
        mode: mode || "auto",
      },
    };

    return reply.send(response);
  } catch (error: any) {
    console.error("Send SMS error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to send SMS",
      error: error.message,
      code: 5001,
    });
  }
}

/**
 * Send OTP
 */
export async function sendOTP(req: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      phone,
      phones,
      phone_numbers,
      otp,
      template,
      message_id,
      party_id,
    } = req.body as SMSRequestBody;

    // Validate OTP
    if (!otp) {
      return reply.status(400).send({
        success: false,
        message: "OTP code is required",
        error: "NO_OTP",
        code: 4003,
      });
    }

    // Get phone number
    let phoneNumber: string;

    if (phone) {
      phoneNumber = phone;
    } else if (phones && Array.isArray(phones) && phones.length > 0) {
      phoneNumber = phones[0];
    } else if (phone_numbers) {
      phoneNumber = phone_numbers.split(",")[0];
    } else {
      return reply.status(400).send({
        success: false,
        message: "Phone number is required",
        error: "NO_PHONE",
        code: 4002,
      });
    }

    // Send OTP
    const result = await smsService.sendOTP(phoneNumber, otp, template);

    // Prepare response
    const response = {
      ...result,
      metadata: {
        request_id: message_id || `otp_${Date.now()}`,
        party_id: party_id || null,
        phone_number: phoneNumber,
        otp_sent: true,
        timestamp: new Date().toISOString(),
      },
    };

    return reply.send(response);
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
      code: 5002,
    });
  }
}

/**
 * Send Promotional Offer
 */
export async function sendOffer(req: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      phone,
      phones,
      phone_numbers,
      message,
      offer_title,
      offer_details,
      expiry_date,
      message_id,
      party_id,
      template,
    } = req.body as SMSRequestBody;

    // Validate offer data
    if (!offer_title || !offer_details) {
      return reply.status(400).send({
        success: false,
        message: "Offer title and details are required",
        error: "INCOMPLETE_OFFER_DATA",
        code: 4004,
      });
    }

    // Determine recipients
    let recipients: string | Array<{ phoneNumber: string; message?: string }>;

    if (phone) {
      recipients = phone;
    } else if (phones && Array.isArray(phones)) {
      recipients = phones.join(",");
    } else if (phone_numbers) {
      recipients = phone_numbers;
    } else {
      return reply.status(400).send({
        success: false,
        message: "At least one recipient is required",
        error: "NO_RECIPIENTS",
        code: 4002,
      });
    }

    // Send offer
    const result = await smsService.sendOffer(
      recipients,
      offer_title,
      offer_details,
      expiry_date,
    );

    // Prepare response
    const response = {
      ...result,
      metadata: {
        request_id: message_id || `offer_${Date.now()}`,
        party_id: party_id || null,
        offer_title,
        expiry_date: expiry_date || null,
        timestamp: new Date().toISOString(),
      },
    };

    return reply.send(response);
  } catch (error: any) {
    console.error("Send offer error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to send offer",
      error: error.message,
      code: 5003,
    });
  }
}

/**
 * Send Warning/Alert
 */
export async function sendWarning(req: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      phone,
      phones,
      phone_numbers,
      message,
      warning_title,
      warning_details,
      urgency = "medium",
      message_id,
      party_id,
    } = req.body as SMSRequestBody;

    // Validate warning data
    if (!warning_title || !warning_details) {
      return reply.status(400).send({
        success: false,
        message: "Warning title and details are required",
        error: "INCOMPLETE_WARNING_DATA",
        code: 4005,
      });
    }

    // Determine recipients
    let recipients: string | Array<{ phoneNumber: string; message?: string }>;

    if (phone) {
      recipients = phone;
    } else if (phones && Array.isArray(phones)) {
      recipients = phones.join(",");
    } else if (phone_numbers) {
      recipients = phone_numbers;
    } else {
      return reply.status(400).send({
        success: false,
        message: "At least one recipient is required",
        error: "NO_RECIPIENTS",
        code: 4002,
      });
    }

    // Send warning
    const result = await smsService.sendWarning(
      recipients,
      warning_title,
      warning_details,
      urgency,
    );

    // Prepare response
    const response = {
      ...result,
      metadata: {
        request_id: message_id || `warning_${Date.now()}`,
        party_id: party_id || null,
        warning_title,
        urgency,
        timestamp: new Date().toISOString(),
      },
    };

    return reply.send(response);
  } catch (error: any) {
    console.error("Send warning error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to send warning",
      error: error.message,
      code: 5004,
    });
  }
}

/**
 * Send Transaction Alert
 */
export async function sendTransactionAlert(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const {
      phone,
      phones,
      phone_numbers,
      transaction_type,
      amount,
      reference,
      balance,
      message_id,
      party_id,
    } = req.body as SMSRequestBody;

    // Validate transaction data
    if (!transaction_type || amount === undefined || !reference) {
      return reply.status(400).send({
        success: false,
        message: "Transaction type, amount, and reference are required",
        error: "INCOMPLETE_TRANSACTION_DATA",
        code: 4006,
      });
    }

    // Get phone number
    let phoneNumber: string;

    if (phone) {
      phoneNumber = phone;
    } else if (phones && Array.isArray(phones) && phones.length > 0) {
      phoneNumber = phones[0];
    } else if (phone_numbers) {
      phoneNumber = phone_numbers.split(",")[0];
    } else {
      return reply.status(400).send({
        success: false,
        message: "Phone number is required",
        error: "NO_PHONE",
        code: 4002,
      });
    }

    // Send transaction alert
    const result = await smsService.sendTransactionAlert(
      phoneNumber,
      transaction_type,
      amount,
      reference,
      balance,
    );

    // Prepare response
    const response = {
      ...result,
      metadata: {
        request_id: message_id || `txn_${Date.now()}`,
        party_id: party_id || null,
        transaction_type,
        amount,
        reference,
        balance: balance || null,
        timestamp: new Date().toISOString(),
      },
    };

    return reply.send(response);
  } catch (error: any) {
    console.error("Send transaction alert error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to send transaction alert",
      error: error.message,
      code: 5005,
    });
  }
}

/**
 * Bulk Send with Individual Messages
 */
export async function sendBulk(req: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      recipients,
      message,
      message_id,
      party_id,
      category = "general",
      encoding = "url",
    } = req.body as SMSRequestBody;

    // Validate recipients
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return reply.status(400).send({
        success: false,
        message: "Valid recipients array is required",
        error: "INVALID_RECIPIENTS",
        code: 4007,
      });
    }

    // Validate message
    if (!message) {
      return reply.status(400).send({
        success: false,
        message: "Default message is required",
        error: "NO_MESSAGE",
        code: 4001,
      });
    }

    // Send bulk SMS
    const result = await smsService.sendSMS({
      recipients,
      message,
      type: "bulk",
      category,
      encoding,
    });

    // Prepare response
    const response = {
      ...result,
      metadata: {
        request_id: message_id || `bulk_${Date.now()}`,
        party_id: party_id || null,
        total_recipients: recipients.length,
        category,
        timestamp: new Date().toISOString(),
      },
    };

    return reply.send(response);
  } catch (error: any) {
    console.error("Bulk send error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to send bulk SMS",
      error: error.message,
      code: 5006,
    });
  }
}

/**
 * Create/Register Template
 */
export async function registerTemplate(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const {
      name,
      template,
      variables = [],
      category = "custom",
      example,
    } = req.body as TemplateRequestBody;

    // Validate template data
    if (!name || !template) {
      return reply.status(400).send({
        success: false,
        message: "Template name and content are required",
        error: "INCOMPLETE_TEMPLATE_DATA",
        code: 4008,
      });
    }

    // Note: Template management would need to be implemented separately
    return reply.send({
      success: true,
      message: "Template registration not implemented in current SMSService",
      data: {
        name,
        category,
        variables_count: variables.length,
        example: example || null,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        note: "Extend SMSService to add template management",
      },
    });
  } catch (error: any) {
    console.error("Register template error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to register template",
      error: error.message,
      code: 5007,
    });
  }
}

/**
 * Get Template
 */
export async function getTemplate(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { name } = req.body as TemplateParams;

    if (!name) {
      return reply.status(400).send({
        success: false,
        message: "Template name is required",
        error: "NO_TEMPLATE_NAME",
        code: 4009,
      });
    }

    // Placeholder - implement template retrieval
    return reply.send({
      success: true,
      message: "Template retrieval not implemented in current SMSService",
      data: null,
      metadata: {
        requested_template: name,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Get template error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to get template",
      error: error.message,
      code: 5008,
    });
  }
}

/**
 * Get All Templates
 */
export async function getAllTemplates(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // Placeholder - implement templates retrieval
    return reply.send({
      success: true,
      message: "Template management not implemented in current SMSService",
      data: [],
      metadata: {
        timestamp: new Date().toISOString(),
        note: "Extend SMSService to add template management",
      },
    });
  } catch (error: any) {
    console.error("Get all templates error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to get templates",
      error: error.message,
      code: 5009,
    });
  }
}

/**
 * Update Template
 */
export async function updateTemplate(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { name, ...updates } = req.body as TemplateRequestBody & {
      name: string;
    };

    if (!name) {
      return reply.status(400).send({
        success: false,
        message: "Template name is required",
        error: "NO_TEMPLATE_NAME",
        code: 4009,
      });
    }

    // Placeholder - implement template update
    return reply.send({
      success: true,
      message: "Template update not implemented in current SMSService",
      data: {
        name,
        updates,
        updated: false,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Update template error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to update template",
      error: error.message,
      code: 5010,
    });
  }
}

/**
 * Delete Template
 */
export async function deleteTemplate(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { name } = req.body as TemplateParams;

    if (!name) {
      return reply.status(400).send({
        success: false,
        message: "Template name is required",
        error: "NO_TEMPLATE_NAME",
        code: 4009,
      });
    }

    // Placeholder - implement template deletion
    return reply.send({
      success: true,
      message: "Template deletion not implemented in current SMSService",
      data: {
        name,
        deleted: false,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Delete template error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to delete template",
      error: error.message,
      code: 5011,
    });
  }
}

/**
 * Get Active Providers
 */
export async function getProviders(req: FastifyRequest, reply: FastifyReply) {
  try {
    return reply.send({
      success: true,
      message: "Providers retrieved",
      data: {
        providers: ["bulksmsbd"],
        active: "bulksmsbd",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Get providers error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to get providers",
      error: error.message,
      code: 5012,
    });
  }
}

/**
 * Get Provider Balance
 */
export async function getBalance(req: FastifyRequest, reply: FastifyReply) {
  try {
    // Note: Your SMSService doesn't have balance checking
    // This is a placeholder
    return reply.send({
      success: true,
      message: "Balance check not implemented",
      data: {
        balance: 0,
        currency: "credits",
        provider: "bulksmsbd",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Get balance error:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to get balance",
      error: error.message,
      code: 5013,
    });
  }
}

/**
 * Send Alert/Notification
 */
