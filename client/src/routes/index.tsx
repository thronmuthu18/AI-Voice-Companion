import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Chat from "../pages/Chat";
import Pinned from "../pages/Pinned";
import Archived from "../pages/Archived";
import Settings from "../pages/Settings";
import Profile from "../pages/Profile";
import Pricing from "../pages/Pricing";

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
        path="/pinned"
        element={
          <ProtectedRoute>
            <Pinned />
          </ProtectedRoute>
        }
      />

      <Route
        path="/archived"
        element={
          <ProtectedRoute>
            <Archived />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pricing"
        element={<Pricing />}
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