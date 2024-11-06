import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const App = () => {
  const [storedData, setStoredData] = useState({ email: "" });
  const accessToken = localStorage.getItem("accessToken");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
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
  const navigate = useNavigate();

  const fetchData = async (accessToken) => {
    if (!accessToken) return;
    try {
      const response = await fetch("http://localhost:5000", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStoredData(data);
      } else {
        console.error("Failed to fetch user data, status:", response.status);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
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

    // Calculate score based on criteria
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

  const logout = () => {
    localStorage.removeItem("accessToken");
    navigate("/login");
  };

  const toggleOldPw = () => {
    setShowOld(!showOld);
  };

  const toggleNewPw = () => {
    setShowNew(!showNew);
  };

  const updatePassword = async () => {
    if (oldPw && newPw && newPw.length > 7) {
      const payload = { ...storedData, oldPassword: oldPw, newPassword: newPw };
      const response = await fetch("http://localhost:5000/reset", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const successMessage = await response.text();
        alert(successMessage);
      } else {
        const errorMessage = await response.text();
        alert(errorMessage);
      }
    } else {
      alert("Fill both old and new password.");
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchData(accessToken);
    } else {
      navigate("/login");
    }
  }, [accessToken]);

  // Update strength when newPw changes
  useEffect(() => {
    setStrength(evaluatePasswordStrength(newPw));
  }, [newPw]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col justify-center items-center m-10">
        <p className="font-bold text-3xl text-blue-600">Welcome To Home Page</p>
      </div>
      <div className="gap-6 shadow-lg w-[450px] h-[550px] flex flex-col items-center text-lg p-6">
        <p>
          <span>User: </span>
          <span className="text-blue-500">
            {accessToken && storedData.email}
          </span>
        </p>
        <div className="relative w-full">
          <p className="flex justify-start text-gray-500 text-sm pl-1">
            Current Password
          </p>
          <input
            onChange={(evt) => setOldPw(evt.target.value)}
            type={showOld ? "text" : "password"}
            className="border border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            placeholder="Enter current password"
          />
          <button
            type="button"
            onClick={toggleOldPw}
            className="absolute right-2 top-1/2 transform -translate-y-1/5 text-blue-500"
          >
            {showOld ? "Hide" : "Show"}
          </button>
        </div>
        <div className="relative w-full">
          <p className="flex justify-start text-gray-500 text-sm pl-1">
            New Password
          </p>
          <input
            onChange={(evt) => setNewPw(evt.target.value)}
            type={showNew ? "text" : "password"}
            className="border border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            placeholder="Enter new password"
          />
          <button
            type="button"
            onClick={toggleNewPw}
            className="absolute right-2 top-1/2 transform -translate-y-1/5 text-blue-500"
          >
            {showNew ? "Hide" : "Show"}
          </button>
        </div>
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
          onClick={updatePassword}
          className="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Update Password
        </button>
        <button
          onClick={logout}
          className="bg-red-500 text-white font-semibold py-2 px-4 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default App;
