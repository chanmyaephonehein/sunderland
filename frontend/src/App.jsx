import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingOverlay from "./components/Loading";
// import { FaEdit, FaCheck, FaTimes } from "react-icons/fa";

const App = () => {
  const [loading, setLoading] = useState(false);
  const [storedData, setStoredData] = useState({ email: "", name: "" });
  const accessToken = localStorage.getItem("accessToken");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [show, setShow] = useState(false);
  const [strength, setStrength] = useState({
    score: 0,
    message: "",
    colorClass: "",
  });

  const [editName, setEditName] = useState("");
  const [upper, setUpper] = useState(false);
  const [lower, setLower] = useState(false);
  const [num, setNum] = useState(false);
  const [sym, setSym] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);

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
        navigate("/login");
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

  const togglePw = () => {
    setShow(!show);
  };

  const [countdown, setCountdown] = useState(0);
  const updatePassword = async () => {
    if (oldPw && newPw && newPw.length > 7) {
      const payload = { ...storedData, oldPassword: oldPw, newPassword: newPw };
      const response = await fetch("http://localhost:5000/update-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setOldPw("");
        setNewPw("");
        const successMessage = await response.text();
        alert(successMessage);
        logout();
      } else {
        const errorMessage = await response.text();
        alert(errorMessage);
      }
    } else {
      alert("Fill both old and new password with at least 8.");
    }
  };

  const updateName = async () => {
    if (editName.length > 0) {
      setStoredData({ ...storedData, name: editName });
      const response = await fetch("http://localhost:5000/update-name", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: storedData.email, name: editName }),
      });
      setEditName("");

      if (response.ok) {
        const message = await response.text();
        alert(message);
      } else {
        const errorMessage = await response.text();
        alert(errorMessage);
      }
    } else {
      alert("Fill the name input area to proceed");
    }
  };
  const handleForgotPassword = async () => {
    setShowDialog(true);
  };

  const handleDialogConfirm = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: storedData.email }),
      });
      if (response.ok) {
        alert("Password reset link has been sent to your email. Click OK!");
        setCountdown(60);
      } else {
        alert("Error sending password reset email.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again later.");
    }
    setLoading(false);
    localStorage.setItem("countdown", "60");
    setShowDialog(false);
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
      {loading && <LoadingOverlay />} {/* Show loading overlay when loading */}
      {/* Rest of your SignUp component code */}
      <div className="flex justify-end w-full">
        <button
          onClick={logout}
          className="bg-red-500 text-white font-semibold py-2 m-6 px-4 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Logout
        </button>
      </div>
      <div className="flex flex-col justify-center items-center gap-4">
        <p className="font-bold text-3xl text-blue-600">
          Welcome To Home Page,{" "}
          <span className="text-green-500">
            {accessToken && storedData.name ? storedData.name : "No name yet."}
          </span>{" "}
        </p>
        <p className=" text-md text-blue-600">
          You are logged in with,{" "}
          <span className="text-green-500">
            {accessToken && storedData.email}
          </span>
        </p>
      </div>{" "}
      <div className="flex mt-4 gap-2">
        <input
          value={editName}
          className="border border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          placeholder="Update name here"
          onChange={(e) => setEditName(e.target.value)}
        />
        <button
          onClick={updateName}
          className="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Update
        </button>
      </div>
      <div className="gap-3 shadow-lg w-[450px] h-[550px] flex flex-col items-center text-lg p-6">
        <div className="relative w-full">
          <p className="flex justify-start text-gray-500 text-sm pl-1">
            Current Password
          </p>
          <input
            onChange={(evt) => setOldPw(evt.target.value)}
            type={show ? "text" : "password"}
            className="border border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            placeholder="Enter current password"
          />
          <button
            type="button"
            onClick={togglePw}
            className="absolute right-2 top-1/2 transform -translate-y-1/5 text-blue-500"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        <div className="relative w-full">
          <p className="flex justify-start text-gray-500 text-sm pl-1">
            New Password
          </p>
          <input
            onChange={(evt) => setNewPw(evt.target.value)}
            type={show ? "text" : "password"}
            className="border border-gray-800 rounded-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            placeholder="Enter new password"
          />
          <button
            type="button"
            onClick={togglePw}
            className="absolute right-2 top-1/2 transform -translate-y-1/5 text-blue-500"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>

        <div className="flex flex-col justify-between items-center">
          {charCount > 0 && (
            <p className={`font-semibold text-sm ${strength.colorClass}`}>
              {strength.message}
            </p>
          )}
          <span className="text-sm">{charCount} characters containing:</span>
          <div className="flex gap-3 text-sm">
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
        {countdown === 0 ? (
          <p className="text-center w-full text-sm text-blue-600 font-bold cursor-pointer ">
            Forgot Password?{" "}
            <p
              className="underline hover:text-blue-800"
              onClick={handleForgotPassword}
            >
              Click here to send reset email.
            </p>
          </p>
        ) : (
          <p className="text-center w-full text-sm text-blue-600 font-bold cursor-pointer ">
            {" "}
            Resend After: {formatCountdown(countdown)}
          </p>
        )}
      </div>{" "}
      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <p className="text-lg mb-4">
              Are you sure you want to send the reset email?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDialog(false)}
                className="bg-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDialogConfirm}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
