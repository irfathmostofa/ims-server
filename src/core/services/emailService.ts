import { transporter } from "../../config/email.config";
import { emailTemplates } from "../utils/emailTemplates";

export class EmailService {
  // Generate 6-digit OTP
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP Email
  static async sendOTP(
    email: string,
    userName: string = "User"
  ): Promise<{ success: boolean; otp?: string; error?: string }> {
    try {
      const otp = this.generateOTP();
      const template = emailTemplates.otpEmail(otp, userName);

      await transporter.sendMail({
        from: `"RasianMart" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });

      console.log(`✅ OTP sent to ${email}: ${otp}`);
      return { success: true, otp };
    } catch (error) {
      console.error("❌ Failed to send OTP:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Send Welcome Email
  static async sendWelcomeEmail(
    email: string,
    userName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = emailTemplates.welcomeEmail(userName, email);

      await transporter.sendMail({
        from: `"RasianMart" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });

      console.log(`✅ Welcome email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error("❌ Failed to send welcome email:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Send Password Reset Success Email
  static async sendPasswordResetSuccess(
    email: string,
    userName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = emailTemplates.passwordResetSuccess(userName);

      await transporter.sendMail({
        from: `"RasianMart" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });

      console.log(`✅ Password reset confirmation sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error("❌ Failed to send password reset email:", error);
      return { success: false, error: (error as Error).message };
    }
  }
}
