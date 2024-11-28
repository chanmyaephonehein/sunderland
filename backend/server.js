// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

// Import necessary modules
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "./src/config/index.js";
import axios from "axios";
import nodemailer from "nodemailer";
import crypto from "crypto";

// Initialize Prisma Client for database interactions
export const prisma = new PrismaClient();

// Middleware for checking authentication (valid JWT token)
const checkAuth = (req, res, next) => {
  const headers = req.headers;
  const authorization = headers.authorization;

  // If no authorization header is found, respond with 401
  if (!authorization) return res.send(401);
  try {
    // Extract the JWT token from the Authorization header and verify it
    const accessToken = authorization.split(" ")[1];
    const user = jwt.verify(accessToken, config.jwtSecret);

    // Attach user email to request object and proceed to next middleware
    req["email"] = user.email;
    next();
  } catch (err) {
    // Respond with 401 if the token is invalid or expired
    res.sendStatus(401);
  }
};

// Initialize Express app and use middlewares
const app = express();
app.use(cors()); // Enable CORS (Cross-Origin Resource Sharing)
app.use(express.json()); // Parse JSON requests

const port = 5000; // Set the server port

// Configure email transporter using Gmail service for sending emails
const transporter = nodemailer.createTransport({
  service: "Gmail", // or your preferred email service
  auth: {
    user: process.env.EMAIL_USER, // Gmail account
    pass: process.env.EMAIL_PASS, // App password (to be replaced with environment variable for security)
  },
});

// Function to validate the format of an email using regex
const validateEmailFormat = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Endpoint to fetch user data (requires authentication)
app.get("/", checkAuth, async (req, res) => {
  try {
    // Fetch user data from the database using Prisma
    const userResult = await prisma.users.findFirst({
      where: { email: req.email },
    });

    // If user not found, respond with 404
    if (!userResult) {
      return res.status(404).json({ message: "User not found" });
    }

    // Respond with user's email and name in JSON format
    return res.send({ email: userResult.email, name: userResult.name }); // Responds with JSON format
  } catch (error) {
    // Handle any server errors
    console.error("Error fetching user data:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to handle user login
app.post("/login", async (req, res) => {
  const { email, password, captchaToken } = req.body;

  // Check if the email format is valid
  if (!validateEmailFormat(email)) {
    return res.status(400).send("Invalid email format.");
  }

  const isValid =
    email &&
    email.length > 0 &&
    password &&
    password.length > 7 &&
    captchaToken;
  if (!isValid)
    return res
      .status(400)
      .send("Please fill all fields including email, password, and captcha.");

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

  // Check if user's email is verified
  const isVerify = await prisma.users.findFirst({
    where: { email, verify: true },
  });

  if (!isVerify) return res.status(692).send("Email is not verify.");

  // Check if account is locked due to multiple failed login attempts
  const now = new Date();
  if (isExist.lockUntil && now < isExist.lockUntil) {
    const timeLeft = Math.ceil((isExist.lockUntil - now) / 1000 / 60); // Calculate time left in minutes
    return res
      .status(403)
      .send(`Account is locked! Try again after ${timeLeft} minutes.`);
  }

  // Reset lockUntil field if lock period has expired
  if (isExist.lockUntil && now > isExist.lockUntil) {
    await prisma.users.update({ where: { email }, data: { lockUntil: null } });
  }

  // Check if password is correct
  const correctPw = await bcrypt.compare(password, isExist.password);
  if (!correctPw) {
    // Increment loginAttempts on failed login
    const updateAttemps = await prisma.users.update({
      where: { email },
      data: { loginAttempts: isExist.loginAttempts + 1 },
    });

    // Lock account after 5 failed attempts
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
    // Generate and send a verification code for 2-step authentication
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

    // Send verification email with the code
    await transporter.sendMail(mailOptions);

    res
      .status(200)
      .send("Verification code sent to your email. Please verify.");
  }
});

// Endpoint for user signup
app.post("/signup", async (req, res) => {
  const { name, email, password, captchaToken } = req.body;

  // Validate name
  if (!name || name.trim().length < 3) {
    return res.status(400).send("Name must be at least 3 characters long.");
  }

  // Validate email format
  if (!validateEmailFormat(email)) {
    return res
      .status(400)
      .send("Invalid email format. Please enter a valid email.");
  }

  // Validate password length
  if (!password || password.length < 8) {
    return res.status(400).send("Password must be at least 8 characters long.");
  }

  // Validate all required fields
  if (!captchaToken) {
    return res.status(400).send("Please complete the reCAPTCHA verification.");
  }

  // Verify reCAPTCHA token with Google
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const captchaUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
    const captchaResponse = await axios.post(captchaUrl);

    if (!captchaResponse.data.success) {
      return res
        .status(400)
        .send("reCAPTCHA validation failed. Please try again.");
    }
  } catch (error) {
    return res
      .status(500)
      .send(
        "An error occurred while verifying reCAPTCHA. Please try again later."
      );
  }

  // Check if the email already exists in the database
  const isExist = await prisma.users.findFirst({ where: { email } });
  if (isExist)
    return res
      .status(403)
      .send("Email is already registered by other user. Try another email.");

  const duplicate = await prisma.emailVerifications.findFirst({
    where: { email },
  });

  if (duplicate) await prisma.emailVerifications.delete({ where: { email } });
  try {
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // Token expires in 10 minutes

    // Store the verification token temporarily in the database
    await prisma.emailVerifications.create({
      data: {
        name: name || "",
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
      from: process.env.EMAIL_USER,
      subject: "Verify Your Email",
      text: `Click the link to verify your email: ${verificationUrl}. The link expires in 10 minutes.`,
    };

    // Send email with verification link
    await transporter.sendMail(mailOptions);
    return res
      .status(200)
      .send("Verification email sent. Please check your email.");
  } catch (err) {
    console.error("Error during signup:", err);
    return res.status(500).send("Server error");
  }
});

// Endpoint for verifying email and creating a user account
app.post("/verify-email", async (req, res) => {
  const { token } = req.body; // Extract the verification token from the request body

  try {
    // Find the email verification record in the database that matches the provided token
    // Also check that the token has not expired (expiresAt > current date)
    const verificationRecord = await prisma.emailVerifications.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
    });

    // If the token is not found or has expired, respond with a 400 error and message
    if (!verificationRecord) {
      return res.status(400).send("Invalid or expired verification link.");
    }

    // If the token is valid, hash the password to store it securely in the database
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      verificationRecord.password,
      saltRounds
    );

    // Create the user in the 'users' table with the verified email and password
    const user = await prisma.users.create({
      data: {
        name: verificationRecord.name || "", // Use the name from the verification record, or an empty string if it's missing
        email: verificationRecord.email, // Store the email from the verification record
        password: hashedPassword, // Store the hashed password
        verify: true, // Mark the user as verified
      },
    });

    // Try to create a record in the password history to store the original password
    // This could be used to track password changes or maintain a history for security reasons
    try {
      const createHistory = await prisma.passwordHistory.create({
        data: {
          userId: user.id, // Associate this password history with the newly created user
          password: verificationRecord.password, // Store the original (unhashed) password
        },
      });
      console.log("create", createHistory); // Log the successful creation of password history
    } catch (err) {
      console.log(err); // If an error occurs while creating the password history, log the error
    }

    // Clean up the email verification record after successful email verification and account creation
    await prisma.emailVerifications.delete({
      where: { id: verificationRecord.id },
    });

    // Respond with a success message once the account has been created and verified
    res.status(200).send("Email verified and account created successfully!");
  } catch (err) {
    // Handle any server-side errors that occur during the process
    console.error("Error during email verification:", err);
    res.status(500).send("Server error"); // Respond with a 500 server error status
  }
});

// Endpoint for update password with key old password
app.put("/update-password", checkAuth, async (req, res) => {
  const { email, oldPassword, newPassword } = req.body; // Extract email, old password, and new password from the request body

  // Validate input payload
  // Check if email is provided and both passwords are non-empty and have more than 7 characters
  const validPayload =
    email.length > 0 &&
    oldPassword &&
    oldPassword.length > 7 &&
    newPassword &&
    newPassword.length > 7;
  if (!validPayload) return res.status(400).send("Bad Request"); // If validation fails, return 400 Bad Request

  // Check if the user exists in the database by the given email
  const isExist = await prisma.users.findFirst({ where: { email } });
  if (!isExist) return res.status(404).send("User is not found"); // If the user does not exist, return 404 Not Found

  const now = new Date();

  // Check if the user has exceeded the daily password change limit
  if (isExist.passwordResetUntil && now > isExist.passwordResetUntil) {
    // Reset the password reset count if the current date is past the previous expiry date
    await prisma.users.update({
      where: { id: isExist.id },
      data: {
        passwordReset: 0, // Reset the counter
        passwordResetUntil: null, // Reset the expiration date
      },
    });
    isExist.passwordReset = 0; // Reset in-memory reference for the current session
  }

  // If the user has already exceeded the daily limit of 3 password resets, return 429 Too Many Requests
  if (isExist.passwordReset >= 3) {
    return res.status(429).send("Password change limit reached for today.");
  }

  // Check if the old password provided matches the stored password
  const correctPw = await bcrypt.compare(oldPassword, isExist.password);
  if (!correctPw) {
    return res.status(401).send("Wrong Current Password. Try again"); // If old password does not match, return 401 Unauthorized
  }

  // Check the password history to ensure the new password has not been used previously
  const history = await prisma.passwordHistory.findMany({
    where: { userId: isExist.id },
  });
  const usedPassword = history.filter((item) => item.password === newPassword);
  if (usedPassword.length > 0) {
    return res
      .status(400)
      .send("This New Password is used before. Try another!"); // If the new password is already used, return 400 Bad Request
  } else {
    // Hash the new password before saving it to the database
    const hashNewPassword = await bcrypt.hash(newPassword, 10);

    // Save the new password in the password history to track previous passwords
    await prisma.passwordHistory.create({
      data: { userId: isExist.id, password: newPassword },
    });

    // Update the user's password in the database and increment the password reset count
    await prisma.users.update({
      where: { email },
      data: {
        password: hashNewPassword, // Update the password
        passwordReset: isExist.passwordReset + 1, // Increment the reset count
        passwordResetUntil:
          isExist.passwordResetUntil ||
          new Date(now.setUTCHours(23, 59, 59, 999)), // Set expiry to end of the day
      },
    });
  }

  // Send an email notification to the user about the successful password change
  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender email (from environment variable)
    to: email, // Recipient email
    subject: "Changed Password", // Subject of the email
    text: `Password is changed successfully!`, // Email body
  };

  await transporter.sendMail(mailOptions); // Send the email using the configured transporter

  // Respond with a success message indicating the password has been successfully changed
  return res.status(200).send("Password is changed successfully!");
});

// Endpoint for update name
app.put("/update-name", checkAuth, async (req, res) => {
  const { email, name } = req.body; // Extract email and name from the request body

  // Validate the input payload: ensure email and name are non-empty
  const validPayload = email && email.length > 0 && name && name.length;
  if (!validPayload) return res.status(400).send("Bad Request"); // Return 400 if validation fails

  // Check if a user with the provided email exists in the database
  const isExist = await prisma.users.findFirst({ where: { email } });
  if (!isExist) return res.status(404).send("User is not found"); // Return 404 if the user is not found

  // Update the user's name in the database using the provided email
  await prisma.users.update({ where: { email }, data: { name } });

  // Return a success message
  return res.status(200).send("Name is changed successfully.");
});

// Endpoint for password reset request
app.post("/forgot", async (req, res) => {
  const { email } = req.body; // Extract the email from the request body

  // Check if a user with the provided email exists in the database
  const isExist = await prisma.users.findFirst({ where: { email } });
  if (!isExist) return res.status(404).send("No user found"); // Return 404 if no user is found with the email
  try {
    // Generate a secure password reset token using the crypto module
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 300000); // Token is valid for 5 minutes (300000ms)

    // Save the generated reset token and expiry time in the database
    await prisma.users.update({
      where: { email },
      data: {
        resetToken, // Store the generated reset token
        resetTokenExpiry: tokenExpiry, // Store the expiry time of the reset token
      },
    });

    // Create a password reset URL containing the reset token
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`; // Adjust the URL to match the frontend route for password reset
    const mailOptions = {
      to: email, // Recipient of the reset email
      from: process.env.EMAIL_USER, // Sender's email (could be your service's email address)
      subject: "Password Reset Request", // Subject of the email
      text: `You requested a password reset. This reset link will last for only 5 mintues.Click the link to reset your password: ${resetUrl}`, // Body of the email with the reset link
    };

    // Send the reset password email to the user
    await transporter.sendMail(mailOptions);

    // Respond with success message once email is sent
    res.status(200).send("Password reset email sent");
  } catch (error) {
    // Handle any errors during the process and log them for debugging
    console.error("Error during password reset:", error);

    // Respond with a 500 status code if an error occurs
    res.status(500).send("Server error");
  }
});

// Endpoint for proceeding reset-password
app.post("/reset-password", async (req, res) => {
  const { token, newPw } = req.body; // Extract the token and new password from the request body

  // Validate if the token and new password are provided, and if the password is sufficiently long
  const isValid = token && newPw && newPw.length > 7;
  if (!isValid) return res.status(400).send("Bad Request."); // Return 400 if validation fails

  // Look for a user with the provided reset token in the database
  const isExist = await prisma.users.findFirst({
    where: { resetToken: token },
  });

  // If no user is found with the token, return 404
  if (!isExist)
    return res.status(404).send("User is not found or token is expired");
  try {
    const now = new Date();

    // Check if the daily reset limit has expired
    if (isExist.passwordResetUntil && now > isExist.passwordResetUntil) {
      // If expired, reset the limit for the new day
      await prisma.users.update({
        where: { id: user.id },
        data: {
          passwordReset: 0,
          passwordResetUntil: null,
        },
      });
      isExist.passwordReset = 0; // Reset in-memory reference for the current session
    }

    // If the user has exceeded the daily reset limit (3 attempts), return a 429 status
    if (isExist.passwordReset >= 3) {
      return res.status(429).send("Password reset limit reached for today.");
    }

    // Check if the reset token is valid and not expired
    const user = await prisma.users.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } }, // Check token expiry
    });

    // If no valid user is found, return an error message
    if (!user) {
      return res.status(400).send("Invalid or expired token.");
    }

    // Hash the new password for security
    const hashedPassword = await bcrypt.hash(newPw, 10);

    // Check if the new password was used previously by the user
    const history = await prisma.passwordHistory.findMany({
      where: { userId: isExist.id },
    });

    // Filter the password history to see if the new password is already used
    const usedPassword = history.filter((item) => item.password === newPw);
    if (usedPassword.length > 0) {
      // If the new password has been used before, return a 400 response
      return res.status(400).send("This Password is used before. Try another!");
    } else {
      // Save the new password in the password history
      await prisma.passwordHistory.create({
        data: { userId: isExist.id, password: newPw },
      });

      // Update the user's password and clear the reset token and expiry
      await prisma.users.update({
        where: { id: user.id },
        data: {
          password: hashedPassword, // Save the new hashed password
          resetToken: null, // Remove the reset token after use
          resetTokenExpiry: null, // Clear the reset token expiry
          passwordReset: user.passwordReset + 1, // Increment the password reset count
          passwordResetUntil:
            user.passwordResetUntil ||
            new Date(now.setUTCHours(23, 59, 59, 999)), // Set expiry for the next day (midnight)
        },
      });

      // Send a confirmation email to the user about the password reset
      const mailOptions = {
        from: process.env.EMAIL_USER, // Sender's email address
        to: user.email, // Recipient's email address
        subject: "Reset Password", // Subject of the email
        text: `Password is just reset successfully`, // Email body
      };

      // Send the email
      await transporter.sendMail(mailOptions);

      // Return a success response
      res.status(200).send("Password reset successful!");
    }
  } catch (error) {
    // Log any errors and send a 500 error response
    console.error("Error during password reset:", error);
    res.status(500).send("An error occurred while resetting the password.");
  }
});

// Endpoint for resetting token expiry
app.post("/expiry", async (req, res) => {
  const { token } = req.body;

  // Validate if token is provided
  if (!token) return res.status(400).send("Bad Request: Token is required");

  // Check if the user exists with the provided token and if it hasn't expired
  const isExist = await prisma.users.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gt: new Date() } }, // Ensure token has not expired
  });

  // If the token doesn't exist or has expired, return a 400 response
  if (!isExist) return res.status(400).send("Invalid or expired token.");

  // If the token is valid, return a 200 status
  if (isExist) return res.status(200);
});

// Endpoint validaiton of registration token
app.post("/valid-register-token", async (req, res) => {
  const { token } = req.body;

  // Validate the token presence in the request body
  if (!token) return res.status(400).send("Bad Request: Token is required");

  try {
    // Check if the token exists and has not expired
    const verificationRecord = await prisma.emailVerifications.findFirst({
      where: { token, expiresAt: { gt: new Date() } }, // Ensure the token is still valid (not expired)
    });

    // If the token is not found or expired, send an error response
    if (!verificationRecord) {
      return res.status(400).send("Invalid or expired verification link.");
    }

    // If the token is valid, return a success response
    else return res.status(200).send("OK");
  } catch (error) {
    console.error("Error during token validation:", error);
    res.status(500).send("Server error while validating token.");
  }
});

// Endpoint for two-step-code to login
app.post("/multi-factor", async (req, res) => {
  const { dialogInput, email } = req.body;
  const genCode = parseInt(dialogInput, 10); // Parse the input code to an integer

  // Check if the code matches the stored one and is still valid (not expired)
  const ifExpire = await prisma.users.findFirst({
    where: { email, twoStepCode: genCode, codeExpiresAt: { gt: new Date() } }, // Ensure code has not expired
  });

  // Verify if the code exists, regardless of expiration
  const validCode = await prisma.users.findFirst({
    where: { email, twoStepCode: genCode },
  });

  // Return error if the code is invalid
  if (!validCode) {
    return res.status(401).send("Your code is wrong! Try again");
  }

  // Return error if the code is expired
  if (!ifExpire) {
    return res.status(400).send("Invalid or expired verification link.");
  }

  try {
    // Update user login attempts after successful verification
    const updateUser = await prisma.users.update({
      where: { email },
      data: { loginAttempts: 0, lockUntil: null }, // Reset login attempts and lock until
    });

    // Prepare JWT payload
    const user = { id: updateUser.id, email: updateUser.email };
    const accessToken = jwt.sign(user, config.jwtSecret, { expiresIn: "1h" }); // Add expiry to toke);

    // Send a confirmation email about login
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Login Account",
      text: `Your account is just log in!`,
    };

    await transporter.sendMail(mailOptions);

    // Respond with the JWT token
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Error during multi-factor authentication:", error);
    return res.status(500).send("An error occurred while verifying the code.");
  }
});

app.listen(port, () => {
  console.log("Server is listening at port ", port);
});
