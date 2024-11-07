import React, { useEffect, useState } from "react";
import logo from "../logo.svg";
import "../App.css";
import { useNavigate } from "react-router-dom";
import LoadingOverlay from "./Loading";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [rem, setRem] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState({ email: "", password: "" });
  const [countdown, setCountdown] = useState(0);

  const login = async () => {
    const isValid = user.email && user.password && user.password.length > 7;
    if (!isValid) return alert("Check your email and password.");
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

  const handleForgotPassword = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (response.ok) {
        alert("Password reset link has been sent to your email. Click OK!");
      } else {
        alert("Fill email input to reset!");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again later.");
    }
    setLoading(false);
    setCountdown(60);
    localStorage.setItem("countdown", "60");
  };

  useEffect(() => {
    const cd = localStorage.getItem("countdown");
    setCountdown(Number(cd));
  }, []);

  const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prevCountdown) => prevCountdown - 1);
      localStorage.setItem("countdown", countdown);
    }, 1000);

    return () => clearInterval(timer); // Clear the timer when the countdown reaches 0 or on component unmount
  }, [countdown]);

  return (
    <div className="flex flex-row items-center justify-center min-h-screen bg-gray-50">
      {loading && <LoadingOverlay />}{" "}
      <div className="App flex flex-col gap-5 w-[400px] shadow-lg p-10">
        <img src={logo} className="App-logo" alt="logo" />
        <h1 className="text-2xl">Login</h1>{" "}
        <div>
          <p className="flex justify-start text-gray-500 text-sm pl-1">Email</p>
          <input
            onChange={(evt) => setUser({ ...user, email: evt.target.value })}
            type="email"
            className=" border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 border-2 focus:ring-blue-500 w-full"
            placeholder="Enter your email"
          />
        </div>
        <div className="relative w-full">
          <p className="flex justify-start text-gray-500 text-sm pl-1">
            Password
          </p>
          <input
            onChange={(evt) => setUser({ ...user, password: evt.target.value })}
            type={showPassword ? "text" : "password"}
            className=" border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 border-2 focus:ring-blue-500 w-full"
            placeholder="Enter your password"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 transform -translate-y-1/5 text-blue-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div className="flex justify-between items-top">
          <div className="flex justify-center items-center">
            <input
              onClick={() => setRem(!rem)}
              type="checkbox"
              id="checkbox1"
              name="checkbox1"
            />
            <label>RememberMe</label>{" "}
          </div>
          {countdown === 0 ? (
            <p
              onClick={handleForgotPassword}
              className="text-right w-full text-sm text-blue-600 font-bold cursor-pointer underline hover:text-blue-800"
            >
              Forgot Password?
            </p>
          ) : (
            <p className="text-right w-full text-sm text-blue-600 font-bold cursor-pointer ">
              {" "}
              Wait: {formatCountdown(countdown)}
            </p>
          )}
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
