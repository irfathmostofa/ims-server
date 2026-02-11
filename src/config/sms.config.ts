// smsConfig.ts

import SMSService from "../core/services/smsService";


// Configuration
const smsConfig = {
  apiKey: process.env.SMS_API_KEY || "8mqF9BTFnPgkNSl3WY86",
  senderId: process.env.SMS_SENDER_ID || "YOUR_SENDER_ID",
  baseUrl: process.env.SMS_API_URL || "http://bulksmsbd.net/api/smsapi",
};

// Create singleton instance
export const smsService = new SMSService(smsConfig);

// Export for direct use
export default smsService;
