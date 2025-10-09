// In-memory OTP storage (use Redis in production)
const otpStorage = new Map();

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP with expiry (10 minutes)
export const storeOTP = (identifier, otp, type) => {
  const key = `${identifier}_${type}`;
  const expiryTime = Date.now() + (10 * 60 * 1000); // 10 minutes
  
  otpStorage.set(key, {
    otp,
    expiryTime,
    attempts: 0
  });
  
  // Clean up expired OTPs
  setTimeout(() => {
    otpStorage.delete(key);
  }, 10 * 60 * 1000);
};

// Verify OTP
export const verifyOTPCode = (identifier, otp, type) => {
  const key = `${identifier}_${type}`;
  const storedData = otpStorage.get(key);
  
  if (!storedData) {
    return false; // OTP not found
  }
  
  if (Date.now() > storedData.expiryTime) {
    otpStorage.delete(key);
    return false; // OTP expired
  }
  
  if (storedData.attempts >= 3) {
    otpStorage.delete(key);
    return false; // Too many attempts
  }
  
  storedData.attempts++;
  
  if (storedData.otp === otp) {
    otpStorage.delete(key); // Remove OTP after successful verification
    return true;
  }
  
  return false; // Invalid OTP
};

// Clean expired OTPs (run periodically)
export const cleanExpiredOTPs = () => {
  const now = Date.now();
  for (const [key, data] of otpStorage.entries()) {
    if (now > data.expiryTime) {
      otpStorage.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanExpiredOTPs, 5 * 60 * 1000);