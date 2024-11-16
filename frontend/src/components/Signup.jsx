import React, { useEffect, useState } from "react";
import logo from "../logo.svg";
import "../App.css";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import LoadingOverlay from "./Loading";

const SignUp = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };
  const [email, setEmail] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [doMatch, setDoMatch] = useState(false);
  const [strength, setStrength] = useState({
    score: 0,
    message: "",
    colorClass: "",
  });
  const [upper, setUpper] = useState(false);
  const [lower, setLower] = useState(false);
  const [num, setNum] = useState(false);
  const [sym, setSym] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [newUser, setNewUser] = useState({ email: "", password: "" });
  const [captchaToken, setCaptchaToken] = useState(null); // Captcha token state
  const [loading, setLoading] = useState(false);

  const isPwMatch = () => {
    setDoMatch(pw1 === pw2);
  };

  const forEmail = (email) => {
    setEmail(email);
    setNewUser({ ...newUser, email });
  };

  const forPw1 = (pw1) => {
    setPw1(pw1);
    setNewUser({ ...newUser, password: pw1 });
  };

  const signUpFunction = async () => {
    setLoading(true);
    if (email && captchaToken && pw1 === pw2 && pw1.length >= 8) {
      const response = await fetch("http://localhost:5000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newUser, captchaToken }),
      });
      if (response.ok) {
        const message = await response.json();
        alert(message);
        setLoading(false);
      } else {
        const errorMessage = await response.text();
        alert(errorMessage);
        setLoading(false);
      }
    } else {
      alert(
        "Complete the form and reCAPTCHA verification & Password at least 8."
      );
      setLoading(false);
    }
    setLoading(false);
  };

  const evaluatePasswordStrength = (pw) => {
    let score = 0;
    const lengthCriteria = pw.length >= 8;
    const upperCriteria = /[A-Z]/.test(pw);
    const lowerCriteria = /[a-z]/.test(pw);
    const numberCriteria = /[0-9]/.test(pw);
    const symbolCriteria = /[@$!%*?&#]/.test(pw);

    setUpper(upperCriteria);
    setLower(lowerCriteria);
    setNum(numberCriteria);
    setSym(symbolCriteria);
    setCharCount(pw.length);

    // Determine score based on length first
    if (pw.length < 5) {
      score = 0; // Very Weak
    } else if (pw.length < 7) {
      score = 1; // Weak
    } else if (pw.length < 12) {
      score = 1; // Moderate && Strong
      if (upperCriteria) score++;
      if (lowerCriteria) score++;
      if (numberCriteria) score++;
      if (symbolCriteria) score++;
    } else {
      // Length is 8 or more, check complexity
      // score += 3; // Start with Strong
      score += 2;
      if (upperCriteria) score++;
      if (lowerCriteria) score++;
      if (numberCriteria) score++;
      if (symbolCriteria) score++;
    }

    let message = "";
    let colorClass = "";

    // Determine strength message and color based on score
    switch (score) {
      case 0:
        message = "Very Weak";
        colorClass = "text-red-500"; // Red
        break;
      case 1:
        message = "Weak";
        colorClass = "text-orange-500"; // Orange
        break;
      case 2:
        message = "Moderate";
        colorClass = "text-yellow-500"; // Yellow
        break;
      case 3:
        message = "Moderate";
        colorClass = "text-yellow-500"; // Yellow
        break;
      case 4:
        message = "Moderate";
        colorClass = "text-yellow-500"; // Yellow
        break;
      case 5:
        message = "Strong";
        colorClass = "text-blue-500"; // Blue
        break;
      case 6:
        message = "Very Strong";
        colorClass = "text-green-500"; // Green
        break;
      default:
        message = "Try again"; // Fallback
        colorClass = "text-red-500"; // Red
    }

    return { score, message, colorClass }; // Return score, message, and color
  };

  const captcha = (value) => {
    setCaptchaToken(value); // Save captcha token to state
  };

  useEffect(() => {
    isPwMatch();
    setStrength(evaluatePasswordStrength(pw1));
  }, [pw1, pw2]);

  return (
    <div className="flex flex-row items-center justify-center min-h-screen bg-gray-50">
      {loading && <LoadingOverlay />}
      <div className="App flex flex-col gap-3 w-[400px] shadow-lg p-10">
        <img src={logo} className="App-logo" alt="logo" />
        <h1 className="text-2xl">Sign Up</h1>
        <div>
          <p className="flex justify-start text-gray-500 text-sm pl-1">Email</p>
          <input
            onChange={(evt) => forEmail(evt.target.value)}
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
            onChange={(evt) => forPw1(evt.target.value)}
            type={showPassword ? "text" : "password"}
            className="border-2 border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-2 top-1/2 transform -translate-y-1/5 text-blue-500"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div className="relative w-full">
          <p className="flex justify-start text-gray-500 text-sm pl-1">
            Re-Password
          </p>
          <input
            onChange={(evt) => setPw2(evt.target.value)}
            type={showPassword ? "text" : "password"}
            className="border-2 border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            placeholder="Re-enter your password"
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-2 top-1/2 transform -translate-y-1/5 text-blue-500"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <ReCAPTCHA
          sitekey="6Ld7M3YqAAAAANCNShezYh2Jrz64TUMFk8xzq5-W"
          onChange={captcha}
        />
        <div className="flex flex-col justify-between items-center">
          {charCount > 0 && (
            <p className={`font-semibold text-lg ${strength.colorClass}`}>
              {strength.message}
            </p>
          )}
          <span>{charCount} characters containing:</span>
          <div className="flex gap-3">
            <p
              className={
                lower ? "text-green-500 font-semibold" : "text-gray-500"
              }
            >
              Lowercase
            </p>
            <p
              className={
                upper ? "text-green-500 font-semibold" : "text-gray-500"
              }
            >
              Uppercase
            </p>
            <p
              className={num ? "text-green-500 font-semibold" : "text-gray-500"}
            >
              Numbers
            </p>
            <p
              className={sym ? "text-green-500 font-semibold" : "text-gray-500"}
            >
              Symbols
            </p>
          </div>
        </div>
        <button
          onClick={signUpFunction}
          className="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Sign Up
        </button>
        <p>
          Already have an account?{" "}
          <span
            className="text-blue-600 underline cursor-pointer"
            onClick={() => navigate("/")}
          >
            Login
          </span>{" "}
          Here.
        </p>
      </div>
    </div>
  );
};

export default SignUp;
