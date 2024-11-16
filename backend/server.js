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
    await prisma.users.update({
      where: { email },
      data: { loginAttempts: 0, lockUntil: null },
    });
    const user = { id: isExist.id, email: isExist.email };
    const accessToken = jwt.sign(user, config.jwtSecret);
    return res.status(200).send({ accessToken });
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
  const validPayload =
    email.length > 0 &&
    oldPassword &&
    oldPassword.length > 7 &&
    newPassword &&
    newPassword.length > 7;
  console.log(email, oldPassword, newPassword);
  if (!validPayload) return res.status(400).send("Bad Request");
  const hashNewPassword = await bcrypt.hash(newPassword, 10);
  console.log(newPassword, hashNewPassword);
  const isExist = await prisma.users.findFirst({ where: { email } });
  if (!isExist) return res.status(404).send("User is not found");
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
    await prisma.passwordHistory.create({
      data: { userId: isExist.id, password: newPassword },
    });

    await prisma.users.update({
      where: { email },
      data: { password: hashNewPassword },
    });
  }
  return res.status(200).send("Password is changed successfully!");
});

// Add a new endpoint for password reset request
app.post("/forgot", async (req, res) => {
  const { email } = req.body;
  const isExist = await prisma.users.findFirst({ where: { email } });
  if (!isExist) return res.status(404).send("No user found");
  try {
    // Check if user exists
    const user = await prisma.users.findFirst({ where: { email } });
    if (!user) return res.status(404).send("User not found");

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
    // Find the user by reset token
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
        },
      });

      res.status(200).send("Password reset successful!");
    }
  } catch (error) {
    console.error("Error during password reset:", error);
    res.status(500).send("An error occurred while resetting the password.");
  }
});

app.post("/expiry", async (req, res) => {
  const { token } = req.body;
  console.log(token);
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

app.listen(port, () => {
  console.log("Server is listening at port ", port);
});
