import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Chat from "../pages/Chat";

import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={<Navigate to="/chat" replace />}
      />

      <Route
        path="*"
        element={<Navigate to="/chat" replace />}
      />
    </Routes>
  );
}