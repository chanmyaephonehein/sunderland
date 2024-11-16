import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "../components/Login";
import SignUp from "../components/Signup";
import PrivateRoute from "./PrivateRoute";
import App from "../App";
import ResetPassword from "../components/ResetPassword";
import VerifyEmail from "../components/VerifyEmail";

const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" Component={SignUp} />
        <Route path="/login" Component={Login} />{" "}
        <Route path="/reset-password/:token" Component={ResetPassword} />
        <Route path="/verify-email/:token" Component={VerifyEmail} />
        <Route element={<PrivateRoute />}>
          <Route path="/" Component={App} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
