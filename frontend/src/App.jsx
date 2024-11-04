import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const App = () => {
  const [storedData, setStoredData] = useState({ email: "" });
  const accessToken = localStorage.getItem("accessToken");
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

  useEffect(() => {
    if (accessToken) {
      fetchData(accessToken);
    } else {
      navigate("/login");
    }

    console.log(storedData);
  }, [accessToken]);
  return (
    <div>
      <div>{accessToken && `welcome ${storedData.email}`}</div>
    </div>
  );
};

export default App;
