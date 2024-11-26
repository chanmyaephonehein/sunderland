import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const PrivateRoute = () => {
  // Retrieve the access token from localStorage
  const accessToken = localStorage.getItem("accessToken");

  // If the access token exists, render the child components (via <Outlet />)
  // Otherwise, redirect the user to the login page
  return accessToken ? <Outlet /> : <Navigate to={"/login"} />;
};

export default PrivateRoute;
