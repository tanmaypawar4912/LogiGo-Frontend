
import { Route, Routes } from "react-router";

import Home from "./pages/public/Home";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

import CustomerDashboard from "./pages/customer/CustomerDashboard";
import BookDelivery from "./pages/customer/BookDelivery";
import BookingDetails from "./pages/customer/BookingDetails";

import DriverDashboard from "./pages/driver/DriverDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<Home />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      {/* Customer dashboard */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Create a booking */}
      <Route
        path="/customer/book"
        element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <BookDelivery />
          </ProtectedRoute>
        }
      />

      {/* Booking confirmation and details */}
      <Route
        path="/customer/orders/:id"
        element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <BookingDetails />
          </ProtectedRoute>
        }
      />

      {/* Driver dashboard */}
      <Route
        path="/driver"
        element={
          <ProtectedRoute allowedRoles={["driver"]}>
            <DriverDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin dashboard */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default App;
