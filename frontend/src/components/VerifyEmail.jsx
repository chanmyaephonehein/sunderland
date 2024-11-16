import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  console.log(token);

  const handleVerification = async () => {
    try {
      const response = await fetch("http://localhost:5000/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        alert("Email verified and account created successfully!");
        navigate("/login");
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (err) {
      console.error("Error during verification:", err);
      alert("An error occurred. Please try again.");
    }
  };

  const stillValidToken = async () => {
    const response = await fetch("http://localhost:5000/valid-register-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    if (response.ok) {
      return alert("Click a button.");
    } else if (!response.ok) {
      navigate("/");
      return alert(await response.text());
    }
  };

  useEffect(() => {
    stillValidToken();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80 flex flex-col items-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
          Verify Email
        </h2>
        <p className="mb-5">Please "Click" a button to create.</p>
        <button
          onClick={handleVerification}
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-300"
        >
          Verify and Create Account
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
