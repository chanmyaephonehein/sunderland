import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "./src/config/index.js";
import axios from "axios";
import nodemailer from "nodemailer";
import crypto from "crypto";

export const prisma = new PrismaClient();

const checkAuth = (req, res, next) => {
  const headers = req.headers;
  const authorization = headers.authorization;
  if (!authorization) return res.send(401);
  try {
    const accessToken = authorization.split(" ")[1];
    const user = jwt.verify(accessToken, config.jwtSecret);
    req["email"] = user.email;
    next();
  } catch (err) {
    res.sendStatus(401);
  }
};

const app = express();
app.use(cors());
app.use(express.json());

const port = 5000;

// Send password reset email
const transporter = nodemailer.createTransport({
  service: "Gmail", // or your preferred email service
  auth: {
    user: "sunderland239770741@gmail.com",
    pass: "rwoo lmze itoz wnhe",
  },
});

app.get("/", checkAuth, async (req, res) => {
  try {
    const userResult = await prisma.users.findFirst({
      where: { email: req.email },
    });

    if (!userResult) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.send({ email: userResult.email }); // Responds with JSON format
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password, captchaToken } = req.body;
  const isValid =
    email &&
    email.length > 0 &&
    password &&
    password.length > 7 &&
    captchaToken;
  if (!isValid) return res.status(400).send("Bad Request");

  // Verify reCAPTCHA token with Google
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const captchaUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
  const captchaResponse = await axios.post(captchaUrl);
  if (!captchaResponse.data.success) {
    return res.status(400).send({ error: "reCAPTCHA validation failed" });
  }

  // Check user existence
  const isExist = await prisma.users.findFirst({ where: { email } });
  if (!isExist) return res.status(404).send("Not found the user");

  //check if email is verify
  const isVerify = await prisma.users.findFirst({
    where: { email, verify: true },
  });

  if (!isVerify) return res.status(692).send("Email is not verify.");

  //check if account is locked
  const now = new Date();
  if (isExist.lockUntil && now < isExist.lockUntil) {
    const timeLeft = Math.ceil((isExist.lockUntil - now) / 1000 / 60); // Calculate time left in minutes
    return res
      .status(403)
      .send(`Account is locked! Try again after ${timeLeft} minutes.`);
  }

  // reset lockUntil
  if (isExist.lockUntil && now > isExist.lockUntil) {
    await prisma.users.update({ where: { email }, data: { lockUntil: null } });
  }

  //check password
  const correctPw = await bcrypt.compare(password, isExist.password);
  if (!correctPw) {
    // Increment loginAttempts on failed login
    const updateAttemps = await prisma.users.update({
      where: { email },
      data: { loginAttempts: isExist.loginAttempts + 1 },
    });

    // Reset login attempts
    if (updateAttemps.loginAttempts === 5) {
      const lockUntil = new Date(now.getTime() + 5 * 60 * 1000); // lock for 5 minutes
      await prisma.users.update({
        where: { email },
        data: { lockUntil, loginAttempts: 0 },
      });
    }

    const checkStatus = await prisma.users.findFirst({ where: { email } });
    return res
      .status(401)
      .send(
        checkStatus.lockUntil
          ? "Account is locked. Try again later."
          : `Invalid credentials. Account will be locked for 5 mins after attempts. Attempts left: ${
              5 - updateAttemps.loginAttempts
            }`
      );
  } else {
    // Generate and send verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000); // 6-digit code
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // expires in 10 minutes

    await prisma.users.update({
      where: { email },
      data: { codeExpiresAt: expiresAt, twoStepCode: verificationCode },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Login Verification Code",
      text: `Your verification code is ${verificationCode}. It will expire in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res
      .status(200)
      .send("Verification code sent to your email. Please verify.");
  }
});

app.post("/signup", async (req, res) => {
  const { email, password, captchaToken } = req.body;
  const isValid = email && password && password.length > 7 && captchaToken;
  if (!isValid)
    return res
      .status(400)
      .send("Password must at least 8 and fill all the blank");

  // Verify reCAPTCHA token with Google
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const captchaUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
  const captchaResponse = await axios.post(captchaUrl);
  if (!captchaResponse.data.success) {
    return res.status(400).send({ error: "reCAPTCHA validation failed" });
  }

  const isExist = await prisma.users.findFirst({ where: { email } });
  if (isExist) return res.status(403).send("Email is already registered");

  const duplicate = await prisma.emailVerifications.findFirst({
    where: { email },
  });

  if (duplicate) await prisma.emailVerifications.delete({ where: { email } });
  try {
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save token temporarily in a verification table
    await prisma.emailVerifications.create({
      data: {
        email,
        password,
        token: verificationToken,
        expiresAt: tokenExpiry,
      },
    });

    // Send verification email
    const verificationUrl = `http://localhost:3000/verify-email/${verificationToken}`;
    const mailOptions = {
      to: email,
      from: "sunderland239770742@gmail.com",
      subject: "Verify Your Email",
      text: `Click the link to verify your email: ${verificationUrl}. The link expires in 15 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send("Verification email sent. Please check your email.");
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).send("Server error");
  }
});

app.post("/verify-email", async (req, res) => {
  const { token } = req.body;

  try {
    const verificationRecord = await prisma.emailVerifications.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
    });

    if (!verificationRecord) {
      return res.status(400).send("Invalid or expired verification link.");
    }

    // Create the user account
    const hashedPassword = await bcrypt.hash(verificationRecord.password, 10);
    const user = await prisma.users.create({
      data: {
        email: verificationRecord.email,
        password: hashedPassword,
        verify: true,
      },
    });

    try {
      const createHistory = await prisma.passwordHistory.create({
        data: {
          userId: user.id,
          password: verificationRecord.password,
        },
      });
      console.log("create", createHistory);
    } catch (err) {
      console.log(err);
    }

    // Clean up verification record
    await prisma.emailVerifications.delete({
      where: { id: verificationRecord.id },
    });

    res.status(200).send("Email verified and account created successfully!");
  } catch (err) {
    console.error("Error during email verification:", err);
    res.status(500).send("Server error");
  }
});

app.put("/update-password", checkAuth, async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  // Validate input payload
  const validPayload =
    email.length > 0 &&
    oldPassword &&
    oldPassword.length > 7 &&
    newPassword &&
    newPassword.length > 7;
  if (!validPayload) return res.status(400).send("Bad Request");
  const isExist = await prisma.users.findFirst({ where: { email } });
  if (!isExist) return res.status(404).send("User is not found");

  const now = new Date();

  // Check daily update limit
  if (isExist.passwordResetUntil && now > isExist.passwordResetUntil) {
    // Reset the limit for the new day
    await prisma.users.update({
      where: { id: isExist.id },
      data: {
        passwordReset: 0,
        passwordResetUntil: null,
      },
    });
    isExist.passwordReset = 0; // Reset in-memory reference for the current session
  }

  if (isExist.passwordReset >= 3) {
    return res.status(429).send("Password change limit reached for today.");
  }

  const correctPw = await bcrypt.compare(oldPassword, isExist.password);
  if (!correctPw) {
    return res.status(401).send("Wrong Current Password. Try again");
  }

  const history = await prisma.passwordHistory.findMany({
    where: { userId: isExist.id },
  });
  const usedPassword = history.filter((item) => item.password === newPassword);
  if (usedPassword.length > 0) {
    return res
      .status(400)
      .send("This New Password is used before. Try another!");
  } else {
    const hashNewPassword = await bcrypt.hash(newPassword, 10);

    // Save new password in history
    await prisma.passwordHistory.create({
      data: { userId: isExist.id, password: newPassword },
    });

    // Update user's password and increment the reset count
    await prisma.users.update({
      where: { email },
      data: {
        password: hashNewPassword,
        passwordReset: isExist.passwordReset + 1,
        passwordResetUntil:
          isExist.passwordResetUntil ||
          new Date(now.setUTCHours(23, 59, 59, 999)), // Set expiry to end of the day
      },
    });
  }

  // Send email notification
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Changed Password",
    text: `Password is changed successfully!`,
  };

  await transporter.sendMail(mailOptions);

  return res.status(200).send("Password is changed successfully!");
});

// Add a new endpoint for password reset request
app.post("/forgot", async (req, res) => {
  const { email } = req.body;
  const isExist = await prisma.users.findFirst({ where: { email } });
  if (!isExist) return res.status(404).send("No user found");
  try {
    // Generate a password reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 300000); // Token valid for 5 minutes

    // Save token and expiry in the database
    await prisma.users.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry: tokenExpiry,
      },
    });

    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`; // Adjust to your frontend URL
    const mailOptions = {
      to: email,
      from: "sunderland239770741@gmail.com",
      subject: "Password Reset Request",
      text: `You requested a password reset. This reset link will last for only 5 mintues.Click the link to reset your password: ${resetUrl}`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send("Password reset email sent");
  } catch (error) {
    console.error("Error during password reset:", error);
    res.status(500).send("Server error");
  }
});

app.post("/reset-password", async (req, res) => {
  const { token, newPw } = req.body;
  const isValid = token && newPw && newPw.length > 7;
  if (!isValid) return res.status(400).send("Bad Request.");
  const isExist = await prisma.users.findFirst({
    where: { resetToken: token },
  });
  if (!isExist) return res.status(404).send("User is not found");
  try {
    // Find the user by reset

    const now = new Date();

    // Check daily reset limit
    if (isExist.passwordResetUntil && now > user.passwordResetUntil) {
      // Reset the limit for the new day
      await prisma.users.update({
        where: { id: user.id },
        data: {
          passwordReset: 0,
          passwordResetUntil: null,
        },
      });
      isExist.passwordReset = 0; // Reset in-memory reference for the current session
    }

    if (isExist.passwordReset >= 3) {
      return res.status(429).send("Password reset limit reached for today.");
    }

    const user = await prisma.users.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } }, // Check token expiry
    });

    if (!user) {
      return res.status(400).send("Invalid or expired token.");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPw, 10);

    const history = await prisma.passwordHistory.findMany({
      where: { userId: isExist.id },
    });
    const usedPassword = history.filter((item) => item.password === newPw);
    if (usedPassword.length > 0) {
      return res.status(400).send("This Password is used before. Try another!");
    } else {
      await prisma.passwordHistory.create({
        data: { userId: isExist.id, password: newPw },
      });

      // Update the user's password and clear the reset token and expiry
      await prisma.users.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
          passwordReset: user.passwordReset + 1,
          passwordResetUntil:
            user.passwordResetUntil ||
            new Date(now.setUTCHours(23, 59, 59, 999)), // Set expiry to the end of the current day
        },
      });

      // Send email confirmation
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Reset Password",
        text: `Password is just reset successfully`,
      };

      await transporter.sendMail(mailOptions);

      res.status(200).send("Password reset successful!");
    }
  } catch (error) {
    console.error("Error during password reset:", error);
    res.status(500).send("An error occurred while resetting the password.");
  }
});

app.post("/expiry", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).send("Bad Request");
  const isExist = await prisma.users.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
  });
  if (!isExist) return res.status(400).send("Invalid or expired token.");
  if (isExist) return res.status(200);
});

app.post("/valid-register-token", async (req, res) => {
  const { token } = req.body;
  const key = token;
  if (!key) return res.status(400).send("Bad Request");
  const verificationRecord = await prisma.emailVerifications.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
  });

  if (!verificationRecord) {
    return res.status(400).send("Invalid or expired verification link.");
  } else return res.status(200).send("OK");
});

app.post("/multi-factor", async (req, res) => {
  const { dialogInput, email } = req.body;
  const genCode = parseInt(dialogInput, 10);
  const ifExpire = await prisma.users.findFirst({
    where: { email, twoStepCode: genCode, codeExpiresAt: { gt: new Date() } },
  });

  const validCode = await prisma.users.findFirst({
    where: { email, twoStepCode: genCode },
  });

  if (!validCode) {
    return res.status(401).send("Your code is wrong! Try again");
  }
  if (!ifExpire) {
    return res.status(400).send("Invalid or expired verification link.");
  }

  const updateUser = await prisma.users.update({
    where: { email },
    data: { loginAttempts: 0, lockUntil: null },
  });
  const user = { id: updateUser.id, email: updateUser.email };
  const accessToken = jwt.sign(user, config.jwtSecret);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Login Account",
    text: `Your account is just log in!`,
  };

  await transporter.sendMail(mailOptions);

  return res.status(200).json({ accessToken });
});

app.listen(port, () => {
  console.log("Server is listening at port ", port);
});
