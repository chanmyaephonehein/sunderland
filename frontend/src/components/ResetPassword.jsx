import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import logo from "../logo.svg";

const ResetPassword = () => {
  const { token } = useParams(); // Extract the token from the URL using React Router
  const [newPassword, setNewPassword] = useState(""); // State for the new password
  const [confirmPassword, setConfirmPassword] = useState(""); // State for the confirmation password
  const [error, setError] = useState(""); // State to handle error messages
  const navigate = useNavigate(); // React Router hook to navigate between pages
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
  const [strength, setStrength] = useState({
    score: 0,
    message: "",
    colorClass: "",
  }); // State to track password strength
  const [upper, setUpper] = useState(false); // Uppercase letter validation
  const [lower, setLower] = useState(false); // Lowercase letter validation
  const [num, setNum] = useState(false); // Numeric validation
  const [sym, setSym] = useState(false); // Symbol validation
  const [charCount, setCharCount] = useState(0); // Character count

  // Function to check if the token has expired
  const ifExpire = async () => {
    const response = await fetch(`http://localhost:5000/expiry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    if (response.ok) {
      return alert("Reset your password."); // Notify the user to reset their password
    } else if (!response.ok) {
      navigate("/"); // Redirect to home if the token is invalid
      return alert(await response.text()); // Display the server error message
    }
  };

  // Validate the token on component mount
  useEffect(() => {
    ifExpire();
  }, [handlePasswordReset]);

  // Function to handle password reset
  const handlePasswordReset = async (e) => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match."); // Ensure both passwords match
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPw: newPassword }),
      });
      if (response.ok) {
        const message = await response.text();
        alert(message); // Notify success
        localStorage.removeItem("accessToken"); // Clear access token
        navigate("/login"); // Redirect to login page
      } else {
        const errorMessage = await response.text();
        alert(errorMessage); // Show server error message
      }
    } catch (error) {
      setError("Failed to reset password. Please try again."); // Handle network errors
    }
  };

  // Toggle the visibility of the password fields
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Function to evaluate password strength
  const evaluatePasswordStrength = (pw) => {
    // Criteria checks for password complexity
    const lengthCriteria = pw.length >= 8;
    const upperCriteria = /[A-Z]/.test(pw);
    const lowerCriteria = /[a-z]/.test(pw);
    const numberCriteria = /[0-9]/.test(pw);
    const symbolCriteria = /[@$!%*?&#]/.test(pw);

    // Update individual validation states
    setUpper(upperCriteria);
    setLower(lowerCriteria);
    setNum(numberCriteria);
    setSym(symbolCriteria);
    setCharCount(pw.length);

    // Determine score based on length first
    let score = 0;
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

  // Re-evaluate password strength whenever the password changes
  useEffect(() => {
    setStrength(evaluatePasswordStrength(newPassword));
  }, [newPassword]);

  return (
    <div className="flex flex-row items-center justify-center min-h-screen bg-gray-50">
      <div className="App flex flex-col gap-3 w-[400px] shadow-lg p-10">
        <img src={logo} className="App-logo" alt="logo" />
        <h2 className="text-2xl">Reset Password</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div className="relative w-full">
          <p className="flex justify-start text-gray-500 text-sm pl-1">
            New Password
          </p>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="border-2 border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
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
            Confirm New Password
          </p>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="border-2 border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-2 top-1/2 transform -translate-y-1/5 text-blue-500"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>{" "}
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
          className="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          onClick={handlePasswordReset}
        >
          Reset Password
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;
