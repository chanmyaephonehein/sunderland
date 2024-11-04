import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "./src/config/index.js";

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
  if (!isValid) return res.sendStatus(400);
  const isExist = await prisma.users.findFirst({ where: { email } });
  if (!isExist) return res.sendStatus(404);

  const correctPw = await bcrypt.compare(password, isExist.password);
  if (!correctPw) return res.status(401).send("Invalid Credential");
  const user = { id: isExist.id, email: isExist.email };
  const accessToken = jwt.sign(user, config.jwtSecret);
  res.send({ accessToken });
});

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const isValid = email && email.length > 0 && password && password.length > 7;
  if (!isValid) return res.send({ error: "Email and password are necessary." });
  try {
    const isExist = await prisma.users.findFirst({ where: { email } });
    if (isExist) return res.send("Email is already registered");

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.users.create({
      data: { email, password: hashedPassword },
    });
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.listen(port, () => {
  console.log("Server is listening at port ", port);
});
