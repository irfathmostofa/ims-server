export const emailTemplates = {
  // OTP Email Template
  otpEmail: (otp: string, userName: string = "User") => ({
    subject: "Your OTP Verification Code - RasianMart",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px solid #667eea; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 OTP Verification</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>Thank you for using RasianMart! Your OTP verification code is:</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            
            <p><strong>This code will expire in 2 minutes.</strong></p>
            <p>If you didn't request this code, please ignore this email or contact our support team.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 14px;">
                <strong>Security Tips:</strong><br>
                • Never share your OTP with anyone<br>
                • RasianMart will never ask for your OTP via phone or email<br>
                • Make sure you're on our official website
              </p>
            </div>
          </div>
          <div class="footer">
            <p>© 2024 RasianMart. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Welcome Email Template
  welcomeEmail: (userName: string, userEmail: string) => ({
    subject: "Welcome to RasianMart! 🎉",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .feature-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to RasianMart!</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>We're excited to have you join our community! Your account has been successfully created.</p>
            
            <div class="feature-box">
              <h3>✨ What's Next?</h3>
              <ul>
                <li>Explore thousands of products</li>
                <li>Get exclusive deals and offers</li>
                <li>Track your orders in real-time</li>
                <li>Enjoy secure and fast checkout</li>
              </ul>
            </div>
            
            <p style="text-align: center;">
              <a href="https://inventory-mart.netlify.app/" class="button">Start Shopping</a>
            </p>
            
            <p>If you have any questions, our support team is here to help!</p>
            <p>Email: support@rasianmart.com</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© 2024 RasianMart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Password Reset Success Email
  passwordResetSuccess: (userName: string) => ({
    subject: "Password Reset Successful - RasianMart",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-icon { font-size: 48px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Reset Successful</h1>
          </div>
          <div class="content">
            <div class="success-icon">🔐</div>
            <h2>Hello ${userName},</h2>
            <p>Your password has been successfully reset.</p>
            <p>You can now log in to your account using your new password.</p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <strong>⚠️ Security Alert:</strong><br>
              If you didn't make this change, please contact our support team immediately.
            </div>
            
            <p>For your security:</p>
            <ul>
              <li>Don't share your password with anyone</li>
              <li>Use a strong, unique password</li>
              <li>Enable two-factor authentication if available</li>
            </ul>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© 2024 RasianMart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};
