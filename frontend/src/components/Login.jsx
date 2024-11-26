import React, { useEffect, useState } from "react";
import logo from "../logo.svg";
import "../App.css";
import { useNavigate } from "react-router-dom";
import LoadingOverlay from "./Loading";
import ReCAPTCHA from "react-google-recaptcha";

const Login = () => {
  // State declarations
  const [loading, setLoading] = useState(false); // Tracks loading state
  const navigate = useNavigate(); // Provides navigation functionality
  const [showPassword, setShowPassword] = useState(false); // Toggles password visibility
  const [user, setUser] = useState({ email: "", password: "" }); // Stores user email and password
  const [countdown, setCountdown] = useState(0); // Countdown timer for reset link
  const [captchaToken, setCaptchaToken] = useState(null); // Captcha token state
  const [showForgotPassword, setShowForgotPassword] = useState(false); // Tracks forgot password dialog visibility
  const [showSuccessDialog, setShowSuccessDialog] = useState(false); // Tracks success dialog visibility
  const [dialogInput, setDialogInput] = useState(""); // Stores input in the success dialog

  // Email validation helper function
  const validateEmailFormat = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Handles login action
  const login = async () => {
    // Validate email format
    if (!validateEmailFormat(user.email)) {
      alert("Invalid email format. Please enter a valid email.");
      return;
    }

    const isValid =
      user.email && user.password && user.password.length > 7 && captchaToken;
    if (!isValid) return alert("Fill email, password and captcha");

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...user, captchaToken }),
      });
      if (response.ok) {
        const message = await response.text();
        alert(message);

        setShowSuccessDialog(true); // Open success dialog
      } else {
        const errorMessage = await response.text();
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    }
    setLoading(false);
  };

  // Handles sending the reset email
  const handleSendMail = async () => {
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
        setCountdown(60);
        setUser({ ...user, email: "" });
      } else {
        alert("Fill email input to reset!");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again later.");
    }
    setLoading(false);
    localStorage.setItem("countdown", "60");
  };

  // Handles multi-factor authentication
  const confirmCode = async () => {
    if (dialogInput && user.email) {
      const response = await fetch(`http://localhost:5000/multi-factor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dialogInput, email: user.email }),
      });

      if (response.ok) {
        alert("Login Successful");
        const responseData = await response.json();
        const accessToken = responseData.accessToken;
        localStorage.setItem("accessToken", accessToken);
        navigate("/");
      } else {
        console.log("lee");
        const message = await response.text();
        alert(message);
      }
    }
  };

  // Captcha callback
  const captcha = (value) => {
    setCaptchaToken(value); // Save captcha token to state
  };

  // Initialize countdown from localStorage
  useEffect(() => {
    const cd = localStorage.getItem("countdown");
    setCountdown(Number(cd));
  }, []);

  // Formats the countdown for display
  const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Countdown timer logic
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
      {loading && <LoadingOverlay />}
      <div className="App flex flex-col gap-5 w-[400px] shadow-lg p-10">
        <img src={logo} className="App-logo" alt="logo" />
        <h1 className="text-2xl">Login</h1>
        <div>
          <p className="flex justify-start text-gray-500 text-sm pl-1">Email</p>
          <input
            onChange={(evt) => setUser({ ...user, email: evt.target.value })}
            type="email"
            className="border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 border-2 focus:ring-blue-500 w-full"
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
            className="border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 border-2 focus:ring-blue-500 w-full"
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
        <p
          onClick={() => setShowForgotPassword(true)}
          className="text-right w-full text-sm text-blue-600 font-bold cursor-pointer underline hover:text-blue-800"
        >
          Forgot Password?
        </p>
        {showForgotPassword && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded shadow-lg w-[300px]">
              <h2 className="text-xl mb-4">Reset Password</h2>
              <input
                onChange={(evt) =>
                  setUser({ ...user, email: evt.target.value })
                }
                type="email"
                className="border-gray-800 rounded-sm p-2 mb-4 focus:outline-none focus:ring-2 border-2 focus:ring-blue-500 w-full"
                placeholder="Enter your email"
              />
              {countdown === 0 ? (
                <button
                  onClick={handleSendMail}
                  className="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 w-full"
                >
                  Send Reset Link
                </button>
              ) : (
                <p className="text-center text-sm text-blue-600 font-bold">
                  Wait: {formatCountdown(countdown)}
                </p>
              )}
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setUser({ ...user, email: "" });
                }}
                className="mt-4 text-gray-500 underline w-full text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {showSuccessDialog && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded shadow-lg w-[300px]">
              <h2 className="text-xl mb-4">Success!</h2>
              <p className="mb-4">Please provide additional input:</p>
              <input
                type="text"
                value={dialogInput}
                onChange={(e) => setDialogInput(e.target.value)}
                className="border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 border-2 focus:ring-blue-500 w-full"
                placeholder="Enter details"
              />
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => setShowSuccessDialog(false)}
                  className="bg-gray-500 text-white font-semibold py-2 px-4 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmCode();
                  }}
                  className="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
        <ReCAPTCHA
          sitekey="6Ld7M3YqAAAAANCNShezYh2Jrz64TUMFk8xzq5-W"
          onChange={captcha}
        />
        <button
          onClick={login}
          className="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Login
        </button>
        <span>
          Don't have an account?{" "}
          <a href="/signup" className="font-semibold text-blue-500">
            Sign up
          </a>
        </span>
      </div>
    </div>
  );
};

export default Login;
