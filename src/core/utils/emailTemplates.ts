// lib/emailTemplates.ts

import nodemailer from "nodemailer";

// ─── Brand constants ──────────────────────────────────────────────────────────

const BRAND = {
  name: "InventoryMart",
  url: "https://inventorymart.com",
  support: "support@inventorymart.com",
  primary: "#006747",
  secondary: "#DA291C",
  accent: "#F68B1E",
  year: new Date().getFullYear(),
};

// ─── Shared layout ────────────────────────────────────────────────────────────

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; color: #333; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: ${BRAND.primary}; padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p  { color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 6px; }
    .body { padding: 36px 40px; }
    .body h2 { font-size: 20px; color: #111; margin-bottom: 10px; }
    .body p  { font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 14px; }
    .body ul { padding-left: 20px; margin-bottom: 14px; }
    .body li { font-size: 14px; line-height: 1.8; color: #555; }
    .btn { display: inline-block; padding: 13px 32px; background: ${BRAND.primary}; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .btn-danger { background: ${BRAND.secondary} !important; }
    .btn-accent { background: ${BRAND.accent} !important; }
    .btn-wrap   { text-align: center; margin: 24px 0; }
    .otp-box    { background: #f8fdf9; border: 2px dashed ${BRAND.primary}; border-radius: 12px; padding: 24px 40px; text-align: center; margin: 24px 0; }
    .otp-code   { font-size: 38px; font-weight: 800; letter-spacing: 12px; color: ${BRAND.primary}; }
    .otp-exp    { font-size: 13px; color: #888; margin-top: 8px; }
    .info-box   { background: #f8fdf9; border-left: 4px solid ${BRAND.primary}; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
    .info-box.warning { background: #fff8f0; border-color: ${BRAND.accent}; }
    .info-box.danger  { background: #fff5f5; border-color: ${BRAND.secondary}; }
    .info-box h3 { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 8px; }
    .info-box p, .info-box li { font-size: 14px; color: #555; line-height: 1.65; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    .table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    .table th { background: #f4f4f4; padding: 10px 14px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #e0e0e0; }
    .table td { padding: 10px 14px; border-bottom: 1px solid #f0f0f0; color: #444; vertical-align: top; }
    .table tr:last-child td { border-bottom: none; }
    .success-icon { font-size: 48px; text-align: center; margin-bottom: 16px; }
    .footer { background: #f9f9f9; padding: 20px 40px; text-align: center; border-top: 1px solid #eee; }
    .footer p { font-size: 12px; color: #888; line-height: 1.7; }
    .footer a { color: ${BRAND.primary}; text-decoration: none; }
    @media (max-width: 600px) {
      .wrapper { margin: 0; border-radius: 0; }
      .body, .header, .footer { padding: 24px 20px; }
      .otp-code { font-size: 28px; letter-spacing: 8px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    ${body}
    <div class="footer">
      <p>© ${BRAND.year} ${BRAND.name}. All rights reserved.</p>
      <p>This is an automated email. Please do not reply.</p>
      <p><a href="mailto:${BRAND.support}">${BRAND.support}</a> &nbsp;|&nbsp; <a href="${BRAND.url}">Visit Store</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export const emailTemplates = {
  // ── OTP Verification ──────────────────────────────────────────────────────
  otpEmail: (otp: string, userName = "User") => ({
    subject: `Your ${BRAND.name} verification code: ${otp}`,
    html: layout(
      "OTP Verification",
      `
      <div class="header">
        <h1>🔐 OTP Verification</h1>
        <p>Use the code below to complete your action</p>
      </div>
      <div class="body">
        <h2>Hello ${userName},</h2>
        <p>Your one-time verification code is:</p>

        <div class="otp-box">
          <div class="otp-code">${otp}</div>
          <p class="otp-exp">⏱ Expires in 2 minutes</p>
        </div>

        <div class="info-box warning">
          <h3>🔒 Security Tips</h3>
          <ul>
            <li>Never share your OTP with anyone</li>
            <li>${BRAND.name} will never ask for your OTP via phone or email</li>
            <li>Make sure you're on our official website</li>
          </ul>
        </div>

        <p style="font-size:13px;color:#aaa;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
    ),
  }),

  // ── Welcome ───────────────────────────────────────────────────────────────
  welcomeEmail: (userName: string, userEmail: string) => ({
    subject: `Welcome to ${BRAND.name}! 🎉`,
    html: layout(
      "Welcome",
      `
      <div class="header">
        <h1>🎉 Welcome to ${BRAND.name}!</h1>
        <p>Your account is ready</p>
      </div>
      <div class="body">
        <h2>Hello ${userName},</h2>
        <p>We're excited to have you join our community! Your account has been successfully created with <strong>${userEmail}</strong>.</p>

        <div class="info-box">
          <h3>✨ What's Next?</h3>
          <ul>
            <li>Explore thousands of products</li>
            <li>Get exclusive deals and offers</li>
            <li>Track your orders in real-time</li>
            <li>Enjoy secure and fast checkout</li>
          </ul>
        </div>

        <div class="btn-wrap">
          <a href="${BRAND.url}" class="btn">Start Shopping</a>
        </div>

        <p style="font-size:13px;color:#888;">If you didn't create this account, please contact us at <a href="mailto:${BRAND.support}">${BRAND.support}</a>.</p>
      </div>
    `,
    ),
  }),

  // ── Password Reset (send link) ────────────────────────────────────────────
  passwordReset: (
    userName: string,
    resetLink: string,
    expiresInMinutes = 30,
  ) => ({
    subject: `Reset your ${BRAND.name} password 🔑`,
    html: layout(
      "Password Reset",
      `
      <div class="header">
        <h1>🔑 Password Reset</h1>
        <p>We received a request to reset your password</p>
      </div>
      <div class="body">
        <h2>Hello ${userName},</h2>
        <p>Click the button below to reset your password. This link expires in <strong>${expiresInMinutes} minutes</strong>.</p>

        <div class="btn-wrap">
          <a href="${resetLink}" class="btn btn-danger">Reset Password</a>
        </div>

        <div class="info-box warning">
          <h3>⚠️ Didn't request this?</h3>
          <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        </div>

        <p style="font-size:12px;color:#aaa;word-break:break-all;">Or copy this link into your browser:<br>${resetLink}</p>
      </div>
    `,
    ),
  }),

  // ── Password Reset Success ────────────────────────────────────────────────
  passwordResetSuccess: (userName: string) => ({
    subject: `Password reset successful — ${BRAND.name} ✅`,
    html: layout(
      "Password Reset Successful",
      `
      <div class="header">
        <h1>✅ Password Reset Successful</h1>
        <p>Your account is now secured with the new password</p>
      </div>
      <div class="body">
        <div class="success-icon">🔐</div>
        <h2>Hello ${userName},</h2>
        <p>Your password has been successfully reset. You can now log in using your new password.</p>

        <div class="info-box danger">
          <h3>⚠️ Wasn't you?</h3>
          <p>If you didn't make this change, please contact us immediately at <a href="mailto:${BRAND.support}">${BRAND.support}</a>.</p>
        </div>

        <div class="info-box">
          <h3>🛡️ Keep your account safe</h3>
          <ul>
            <li>Never share your password with anyone</li>
            <li>Use a strong, unique password</li>
            <li>Log out of devices you no longer use</li>
          </ul>
        </div>

        <div class="btn-wrap">
          <a href="${BRAND.url}/account/login" class="btn">Log In Now</a>
        </div>
      </div>
    `,
    ),
  }),

  // ── Order Confirmation ────────────────────────────────────────────────────
  orderConfirmation: (
    userName: string,
    orderId: string,
    items: { name: string; quantity: number; price: number }[],
    total: number,
  ) => ({
    subject: `Order Confirmed #${orderId} ✅`,
    html: layout(
      "Order Confirmed",
      `
      <div class="header">
        <h1>✅ Order Confirmed!</h1>
        <p>Order #${orderId}</p>
      </div>
      <div class="body">
        <h2>Thank you, ${userName}!</h2>
        <p>Your order has been received and is being processed. We'll notify you once it ships.</p>

        <table class="table">
          <thead>
            <tr>
              <th>Product</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Price</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (i) => `
            <tr>
              <td>${i.name}</td>
              <td style="text-align:center">${i.quantity}</td>
              <td style="text-align:right">৳${i.price.toLocaleString()}</td>
            </tr>`,
              )
              .join("")}
            <tr>
              <td colspan="2" style="text-align:right;font-weight:700;color:#111">Total</td>
              <td style="text-align:right;font-weight:700;color:${BRAND.primary}">৳${total.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="btn-wrap">
          <a href="${BRAND.url}/profile?tab=orders" class="btn">Track Order</a>
        </div>
      </div>
    `,
    ),
  }),

  // ── Order Shipped ─────────────────────────────────────────────────────────
  orderShipped: (
    userName: string,
    orderId: string,
    trackingNumber: string,
    estimatedDelivery: string,
  ) => ({
    subject: `Your order #${orderId} is on its way! 🚚`,
    html: layout(
      "Order Shipped",
      `
      <div class="header">
        <h1>🚚 Your Order is Shipped!</h1>
        <p>Order #${orderId}</p>
      </div>
      <div class="body">
        <h2>Great news, ${userName}!</h2>
        <p>Your order has been dispatched and is on its way to you.</p>

        <div class="info-box">
          <h3>📦 Shipment Details</h3>
          <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
          <p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>
        </div>

        <div class="btn-wrap">
          <a href="${BRAND.url}/track-order?tracking=${trackingNumber}" class="btn">Track Shipment</a>
        </div>
      </div>
    `,
    ),
  }),

  // ── Order Delivered ───────────────────────────────────────────────────────
  orderDelivered: (userName: string, orderId: string) => ({
    subject: `Order #${orderId} Delivered! 🎁`,
    html: layout(
      "Order Delivered",
      `
      <div class="header">
        <h1>🎁 Order Delivered!</h1>
        <p>Order #${orderId}</p>
      </div>
      <div class="body">
        <div class="success-icon">🎉</div>
        <h2>Your order arrived, ${userName}!</h2>
        <p>We hope you love your purchase. If everything looks great, a quick review would mean the world to us — it helps other shoppers too.</p>

        <div class="btn-wrap">
          <a href="${BRAND.url}/profile?tab=reviews" class="btn btn-accent">Write a Review</a>
        </div>

        <hr class="divider" />
        <p style="font-size:13px;color:#888;">Something not right? Contact us at <a href="mailto:${BRAND.support}">${BRAND.support}</a> within 7 days.</p>
      </div>
    `,
    ),
  }),

  // ── Product Enquiry Confirmation (to customer) ────────────────────────────
  enquiryConfirmation: (userName: string, productName: string) => ({
    subject: `We received your enquiry about "${productName}" 📬`,
    html: layout(
      "Enquiry Received",
      `
      <div class="header">
        <h1>📬 Enquiry Received</h1>
      </div>
      <div class="body">
        <h2>Thanks, ${userName}!</h2>
        <p>We've received your enquiry about <strong>${productName}</strong>. Our team will get back to you within <strong>24 hours</strong>.</p>

        <div class="info-box">
          <h3>📋 What happens next?</h3>
          <ul>
            <li>Our team reviews your enquiry</li>
            <li>We'll contact you via phone or email</li>
            <li>You'll receive pricing, availability, and more</li>
          </ul>
        </div>

       
      </div>
    `,
    ),
  }),

  // ── New Enquiry Notification (to admin) ───────────────────────────────────
  enquiryAdminNotification: (payload: {
    enquiryId: string;
    productName: string;
    productSku: string;
    name: string;
    phone: string;
    email?: string;
    quantity: number;
    message: string;
  }) => ({
    subject: `New Enquiry #${payload.enquiryId} — ${payload.productName}`,
    html: layout(
      "New Product Enquiry",
      `
      <div class="header">
        <h1>📥 New Product Enquiry</h1>
        <p>Reference #${payload.enquiryId}</p>
      </div>
      <div class="body">
        <h2>A customer submitted an enquiry</h2>

        <table class="table">
          <tbody>
            <tr><td style="font-weight:600;width:130px">Product</td><td>${payload.productName}</td></tr>
            <tr><td style="font-weight:600">SKU</td><td>${payload.productSku || "—"}</td></tr>
            <tr><td style="font-weight:600">Customer</td><td>${payload.name}</td></tr>
            <tr><td style="font-weight:600">Phone</td><td>${payload.phone}</td></tr>
            <tr><td style="font-weight:600">Email</td><td>${payload.email || "—"}</td></tr>
            <tr><td style="font-weight:600">Quantity</td><td>${payload.quantity}</td></tr>
            <tr><td style="font-weight:600;vertical-align:top">Message</td><td style="white-space:pre-wrap">${payload.message}</td></tr>
          </tbody>
        </table>

      
      </div>
    `,
    ),
  }),
};
