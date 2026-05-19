import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ScanProgressPage from './pages/ScanProgressPage';
import ScanResultsPage from './pages/ScanResultsPage';
import HistoryPage from './pages/HistoryPage';
import ReportPage from './pages/ReportPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes with shared Navbar layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<><Navbar /><main className="flex-1"><div className="pb-5"><Outlet /></div></main></>}>
              <Route path="/"                       element={<HomePage />} />
              <Route path="/scan/:scanId"            element={<ScanProgressPage />} />
              <Route path="/scan/:scanId/results"    element={<ScanResultsPage />} />
              <Route path="/history"                element={<HistoryPage />} />
              <Route path="/report/:scanId"         element={<ReportPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
