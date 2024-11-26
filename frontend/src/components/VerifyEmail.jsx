import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Define the VerifyEmail component
const VerifyEmail = () => {
  // Extract the token from the route parameters
  const { token } = useParams();
  const navigate = useNavigate(); // Hook for programmatic navigation
  console.log(token); // Log the token for debugging purposes

  // Function to handle email verification when the button is clicked
  const handleVerification = async () => {
    try {
      // Send a POST request to the server with the token for verification
      const response = await fetch("http://localhost:5000/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }), // Pass the token as the request body
      });

      if (response.ok) {
        // If the verification is successful, notify the user and navigate to login
        alert("Email verified and account created successfully!");
        navigate("/login");
      } else {
        // Handle any errors returned from the server
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (err) {
      console.error("Error during verification:", err);
      alert("An error occurred. Please try again.");
    }
  };

  // Function to check if the token is still valid before showing the UI
  const stillValidToken = async () => {
    const response = await fetch("http://localhost:5000/valid-register-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    if (response.ok) {
      // If the token is valid, notify the user to proceed
      return alert("Click a button.");
    } else if (!response.ok) {
      // If the token is invalid, redirect to the home page and notify the user
      navigate("/");
      return alert(await response.text());
    }
  };

  // Run the `stillValidToken` function when the component mounts
  useEffect(() => {
    stillValidToken();
  }, []); // Dependency array is empty to ensure it runs only once

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
