import { promises } from "dns";
import { transporter } from "../../config/email.config";
import smsService from "../../config/sms.config";
import { emailTemplates } from "../utils/emailTemplates";

export class EmailService {
  // Generate 6-digit OTP

  // Send OTP Email
  static async sendOTP(
    email: string,
    phone: string,
    userName: string = "User",
    otp: string,
  ): Promise<{ success: boolean; otp?: string; error?: string }> {
    try {
      await smsService.sendOTP(phone, otp);
      const template = emailTemplates.otpEmail(otp, userName);

      await transporter.sendMail({
        from: `"UniStock Pro" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });

      return { success: true, otp };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Send Welcome Email
  static async sendWelcomeEmail(
    email: string,
    userName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = emailTemplates.welcomeEmail(userName, email);

      await transporter.sendMail({
        from: `"UniStock Pro" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Send Password Reset Success Email
  static async sendPasswordResetSuccess(
    email: string,
    userName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = emailTemplates.passwordResetSuccess(userName);

      await transporter.sendMail({
        from: `"UniStock Pro" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  static async sendEnquiryConfirmation(
    email: string,
    userName: string,
    productName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = emailTemplates.enquiryConfirmation(
        userName,
        productName,
      );

      await transporter.sendMail({
        from: `"UniStock Pro" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
  static async sendEnquiryNotificationAdmin(
    payload: Parameters<typeof emailTemplates.enquiryAdminNotification>[0],
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const template = emailTemplates.enquiryAdminNotification(payload);

      await transporter.sendMail({
        from: `"UniStock Pro" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        subject: template.subject,
        html: template.html,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
