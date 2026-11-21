import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./services/auth.js";
import ProtectedRoute from "./components/ProtectedRoute.js";
import Layout from "./components/Layout.js";
import LoginPage from "./pages/LoginPage.js";
import DashboardPage from "./dashboard/DashboardPage.js";
import ProductsPage from "./pages/ProductsPage.js";
import SuppliersPage from "./pages/SuppliersPage.js";
import SalesPage from "./pages/SalesPage.js";
import PurchasesPage from "./pages/PurchasesPage.js";
import ReportsPage from "./pages/ReportsPage.js";
import NotificationsPage from "./pages/NotificationsPage.js";
import UsersPage from "./pages/UsersPage.js";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="purchases" element={<PurchasesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
