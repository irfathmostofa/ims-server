interface OTPData {
  otp: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

export class OTPStore {
  private static store = new Map<string, OTPData>();

  // Store OTP
  static save(email: string, otp: string, expiryMinutes: number = 2): void {
    this.store.set(email.toLowerCase(), {
      otp,
      email,
      expiresAt: Date.now() + expiryMinutes * 60 * 1000,
      attempts: 0,
    });
  }

  // Verify OTP
  static verify(
    email: string,
    otp: string
  ): { valid: boolean; message: string } {
    const data = this.store.get(email.toLowerCase());

    if (!data) {
      return { valid: false, message: "OTP not found or expired" };
    }

    if (Date.now() > data.expiresAt) {
      this.store.delete(email.toLowerCase());
      return { valid: false, message: "OTP has expired" };
    }

    if (data.attempts >= 3) {
      this.store.delete(email.toLowerCase());
      return { valid: false, message: "Too many failed attempts" };
    }

    if (data.otp !== otp) {
      data.attempts++;
      return { valid: false, message: "Invalid OTP" };
    }

    this.store.delete(email.toLowerCase());
    return { valid: true, message: "OTP verified successfully" };
  }

  // Clear expired OTPs (run periodically)
  static clearExpired(): void {
    const now = Date.now();
    for (const [email, data] of this.store.entries()) {
      if (now > data.expiresAt) {
        this.store.delete(email);
      }
    }
  }
}

// Run cleanup every 5 minutes
setInterval(() => OTPStore.clearExpired(), 5 * 60 * 1000);
export default OTPStore;