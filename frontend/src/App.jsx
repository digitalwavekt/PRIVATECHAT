import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import LoginPage    from './pages/LoginPage';
import SignupPage   from './pages/SignupPage';
import ChatLayout   from './pages/ChatLayout';
import ProfilePage  from './pages/ProfilePage';
import ContactsPage from './pages/ContactsPage';

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0d0d0d]">
      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const Public = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
};

function Inner() {
  const { token } = useAuth();
  return (
    <SocketProvider token={token}>
      <Routes>
        <Route path="/login"  element={<Public><LoginPage /></Public>} />
        <Route path="/signup" element={<Public><SignupPage /></Public>} />
        <Route path="/"       element={<Protected><ChatLayout /></Protected>} />
        <Route path="/profile"  element={<Protected><ProfilePage /></Protected>} />
        <Route path="/contacts" element={<Protected><ContactsPage /></Protected>} />
        <Route path="*"       element={<Navigate to="/" replace />} />
      </Routes>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Inner />
      </BrowserRouter>
    </AuthProvider>
  );
}
