import React, { useState } from "react";
import logo from "../logo.svg";
import "../App.css";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [rem, setRem] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState({ email: "", password: "" });
  const login = async () => {
    const response = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    if (response.ok) {
      const responseData = await response.json();
      const accessToken = responseData.accessToken;
      localStorage.setItem("accessToken", accessToken);
      navigate("/");
    } else {
      const errorMessage = await response.text();
      alert(errorMessage);
    }
  };
  return (
    <div className="flex flex-row items-center justify-center min-h-screen bg-gray-50">
      <div className="App flex flex-col gap-5 w-[400px] shadow-lg p-10">
        <img src={logo} className="App-logo" alt="logo" />
        <h1 className="text-2xl">Login</h1>
        <input
          onChange={(evt) => setUser({ ...user, email: evt.target.value })}
          type="email"
          className="border border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 border-2 focus:ring-blue-500 w-full"
          placeholder="Enter your email"
        />
        <div className="relative w-full">
          <input
            onChange={(evt) => setUser({ ...user, password: evt.target.value })}
            type={showPassword ? "text" : "password"}
            className="border border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 border-2 focus:ring-blue-500 w-full"
            placeholder="Enter your password"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <input
              onClick={() => setRem(!rem)}
              type="checkbox"
              id="checkbox1"
              name="checkbox1"
            />
            <label>Remember me</label>{" "}
          </div>
          <p
            className="text-left text-sm text-blue-600 font-bold cursor-pointer"
            onClick={() => navigate("/")}
          >
            Forgot Password?
          </p>
        </div>
        <button
          onClick={() => login()}
          className="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Login
        </button>
        <span>
          Don't have an account? {""}
          <span
            className="text-blue-600 underline cursor-pointer"
            onClick={() => navigate("/signup")}
          >
            Register
          </span>
          {""} Here.
        </span>
      </div>
    </div>
  );
};

export default Login;
