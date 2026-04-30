import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage    from './pages/LoginPage';
import Layout       from './components/Layout';
import Dashboard    from './pages/Dashboard';
import SignupReqs   from './pages/SignupRequests';
import UsersPage    from './pages/UsersPage';
import MessagesPage from './pages/MessagesPage';
import LogsPage     from './pages/LogsPage';

const isAuthed = () => !!localStorage.getItem('pc_admin_token');

const Protected = ({ children }) => isAuthed() ? children : <Navigate to="/login" replace />;
const Public    = ({ children }) => isAuthed() ? <Navigate to="/" replace /> : children;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Public><LoginPage /></Public>} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index              element={<Dashboard />} />
          <Route path="requests"   element={<SignupReqs />} />
          <Route path="users"      element={<UsersPage />} />
          <Route path="messages"   element={<MessagesPage />} />
          <Route path="logs"       element={<LogsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
