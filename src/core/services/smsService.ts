// smsService.ts
export interface SMSConfig {
  apiKey: string;
  senderId: string;
  baseUrl?: string;
}

export interface SMSRecipient {
  phoneNumber: string;
  message?: string; // For individual messages in bulk
}

export interface SMSOptions {
  recipients: string | SMSRecipient[]; // Single number or array of recipients
  message: string; // Main message for single SMS or default for bulk
  type?: "single" | "bulk"; // Auto-detected if not specified
  category?: "otp" | "offer" | "warning" | "alert" | "general";
  encoding?: "url" | "plain";
}

export interface SMSResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

class SMSService {
  private config: SMSConfig;
  private readonly defaultBaseUrl = "http://bulksmsbd.net/api/smsapi";

  constructor(config: SMSConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || this.defaultBaseUrl,
    };
  }

  /**
   * Send SMS to single or multiple recipients
   */
  async sendSMS(options: SMSOptions): Promise<SMSResponse> {
    try {
      const type = options.type || this.detectSMSType(options.recipients);

      if (type === "bulk" && Array.isArray(options.recipients)) {
        return await this.sendBulkSMS(
          options.recipients,
          options.message,
          options.category,
        );
      } else {
        const phoneNumbers =
          typeof options.recipients === "string"
            ? options.recipients
            : options.recipients.map((r) => r.phoneNumber).join(",");

        return await this.sendSingleSMS(
          phoneNumbers,
          options.message,
          options.category,
          options.encoding,
        );
      }
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to send SMS",
        error: error.message,
      };
    }
  }

  /**
   * Send single SMS to one or multiple numbers with same message
   */
  private async sendSingleSMS(
    phoneNumbers: string,
    message: string,
    category?: string,
    encoding: "url" | "plain" = "url",
  ): Promise<SMSResponse> {
    const encodedMessage =
      encoding === "url" ? this.encodeMessage(message) : message;

    const formData = new URLSearchParams({
      api_key: this.config.apiKey,
      senderid: this.config.senderId,
      number: this.formatPhoneNumbers(phoneNumbers),
      message: encodedMessage,
    });

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    };

    try {
      const response = await fetch(this.config.baseUrl!, requestOptions);
      const data = await response.json();

      console.log(
        `[SMS ${category || "general"}] Sent to ${phoneNumbers}: ${data.message || "Success"}`,
      );

      return {
        success: response.ok,
        message: data.message || "SMS sent successfully",
        data,
      };
    } catch (error: any) {
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Send bulk SMS with different messages to different numbers
   */
  private async sendBulkSMS(
    recipients: SMSRecipient[],
    defaultMessage: string,
    category?: string,
  ): Promise<SMSResponse> {
    // Format: "88017XXXXXXXX^message1,88018XXXXXXXX^message2"
    const messagesParam = recipients
      .map((recipient) => {
        const message = recipient.message || defaultMessage;
        const encodedMessage = this.encodeMessage(message);
        return `${recipient.phoneNumber}^${encodedMessage}`;
      })
      .join(",");

    const formData = new URLSearchParams({
      api_key: this.config.apiKey,
      senderid: this.config.senderId,
      messages: messagesParam,
    });

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    };

    try {
      const response = await fetch(this.config.baseUrl!, requestOptions);
      const data = await response.json();

      console.log(
        `[SMS ${category || "bulk"}] Sent ${recipients.length} messages`,
      );

      return {
        success: response.ok,
        message: data.message || "Bulk SMS sent successfully",
        data,
      };
    } catch (error: any) {
      throw new Error(`Failed to send bulk SMS: ${error.message}`);
    }
  }

  /**
   * Send OTP to a single phone number
   */
  async sendOTP(
    phoneNumber: string,
    otp: string,
    template?: string,
  ): Promise<SMSResponse> {
    const defaultTemplate = `Your OTP code is: ${otp}. This OTP will expire in 5 minutes.`;
    const message = template || defaultTemplate;

    return this.sendSMS({
      recipients: phoneNumber,
      message,
      category: "otp",
    });
  }

  /**
   * Send promotional offer
   */
  async sendOffer(
    recipients: string | SMSRecipient[],
    offerTitle: string,
    offerDetails: string,
    expiryDate?: string,
  ): Promise<SMSResponse> {
    const message = `🎉 ${offerTitle} 🎉\n${offerDetails}${
      expiryDate ? `\nOffer valid until: ${expiryDate}` : ""
    }\nTerms & conditions apply.`;

    return this.sendSMS({
      recipients,
      message,
      category: "offer",
    });
  }

  /**
   * Send warning/alert message
   */
  async sendWarning(
    recipients: string | SMSRecipient[],
    warningTitle: string,
    warningDetails: string,
    urgency: "low" | "medium" | "high" = "medium",
  ): Promise<SMSResponse> {
    const urgencyPrefix =
      urgency === "high" ? "🚨 URGENT: " : urgency === "medium" ? "⚠️ " : "";
    const message = `${urgencyPrefix}${warningTitle}\n${warningDetails}\nPlease take necessary action.`;

    return this.sendSMS({
      recipients,
      message,
      category: "warning",
    });
  }

  /**
   * Send alert/notification
   */
  async sendAlert(
    recipients: string | SMSRecipient[],
    alertTitle: string,
    alertDetails: string,
  ): Promise<SMSResponse> {
    const message = `🔔 ${alertTitle}\n${alertDetails}`;

    return this.sendSMS({
      recipients,
      message,
      category: "alert",
    });
  }

  /**
   * Send transactional message
   */
  async sendTransactionAlert(
    phoneNumber: string,
    transactionType: string,
    amount: number,
    reference: string,
    balance?: number,
  ): Promise<SMSResponse> {
    const message = `Transaction ${transactionType}\nAmount: ${amount}\nRef: ${reference}${
      balance ? `\nBalance: ${balance}` : ""
    }`;

    return this.sendSMS({
      recipients: phoneNumber,
      message,
      category: "alert",
    });
  }

  /**
   * Helper method to encode message for URL
   */
  private encodeMessage(message: string): string {
    return encodeURIComponent(message);
  }

  /**
   * Format phone numbers (ensure proper country code)
   */
  private formatPhoneNumbers(numbers: string): string {
    // Ensure numbers are properly formatted
    const numberArray = numbers.split(",").map((num) => {
      let trimmed = num.trim();
      // Add country code if missing (assuming Bangladesh +880)
      if (!trimmed.startsWith("880") && !trimmed.startsWith("+880")) {
        if (trimmed.startsWith("0")) {
          trimmed = "880" + trimmed.substring(1);
        } else {
          trimmed = "880" + trimmed;
        }
      }
      // Remove + if present
      return trimmed.replace("+", "");
    });

    return numberArray.join(",");
  }

  /**
   * Detect SMS type based on recipients
   */
  private detectSMSType(
    recipients: string | SMSRecipient[],
  ): "single" | "bulk" {
    if (typeof recipients === "string") {
      return "single";
    }

    // Check if all recipients have individual messages
    const hasIndividualMessages = recipients.every(
      (r) => r.message !== undefined,
    );
    const hasMultipleMessages = recipients.some((r) => r.message !== undefined);

    // If all have individual messages, use bulk API
    // If mixed, use bulk for flexibility
    return hasIndividualMessages || hasMultipleMessages ? "bulk" : "single";
  }
}

export default SMSService;
