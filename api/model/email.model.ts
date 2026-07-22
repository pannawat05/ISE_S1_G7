interface OtpRecord {
  otp: string;
  expiresAt: number;
}

const otpStore = new Map<string, OtpRecord>();

export async function saveOtp(email: string, otp: string, ttlMs = 5 * 60 * 1000): Promise<void> {
  otpStore.set(email, {
    otp,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function verifyOtp(email: string, otp: string): Promise<string | null> {
  const record = otpStore.get(email);

  if (!record) {
    return "No OTP requested for this email";
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return "OTP has expired";
  }

  if (record.otp !== otp.toString()) {
    return "Invalid OTP code";
  }

  otpStore.delete(email);
  return null;
}

export async function deleteOtp(email: string): Promise<void> {
  otpStore.delete(email);
}
