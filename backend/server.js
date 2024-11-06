import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "./src/config/index.js";
import axios from "axios";

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
  const { email, password } = req.body;
  const isValid = email && email.length > 0 && password && password.length > 7;
  if (!isValid) return res.status(400).send("Bad Request");
  const isExist = await prisma.users.findFirst({ where: { email } });
  if (!isExist) return res.status(404).send("Not found the user");

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
    res.send({ accessToken });
  }
});

app.post("/signup", async (req, res) => {
  const { email, password, captchaToken } = req.body;
  const isExist = await prisma.users.findFirst({ where: { email } });
  if (isExist) return res.status(403).send("Email is already registered");

  // Verify reCAPTCHA token with Google
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const captchaUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;

  try {
    const captchaResponse = await axios.post(captchaUrl);
    if (!captchaResponse.data.success) {
      return res.status(400).send({ error: "reCAPTCHA validation failed" });
    }

    // Proceed with signup if reCAPTCHA is valid

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.users.create({
      data: { email, password: hashedPassword },
    });
    res.sendStatus(200);
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).send("Server error");
  }
});

app.listen(port, () => {
  console.log("Server is listening at port ", port);
});
