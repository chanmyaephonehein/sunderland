export const config = {
  jwtSecret: process.env.JWT_SECRET || "",
  databaseUrl: process.env.DATABASE_URL || "",
  recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || "",
  recaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY || "",
  emailUser: process.env.EMAIL_USER || "",
  emailPass: process.env.EMAIL_PASS || "",
};
