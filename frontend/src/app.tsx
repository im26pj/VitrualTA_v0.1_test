import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useRequireAuth } from './utils/auth';

// 各個頁面元件
import { Choose } from "./Pages/Choose/Choose2";
import { Signin } from "./Pages/Signin/Signin";
import { SignUp } from "./Pages/Signup/Signup";
import { Second } from "./Pages/Second/Second";
import { StudyingGroup } from "./Pages/StudyingGroup/StudyingGroup";
import { ChatRoom } from "./Pages/ChatRoom/ChatRoom2";
import { MemberArea } from "./Pages/MemberArea/Member2";
import { SetVtuber } from "./Pages/SetVtuber/SetVtuber";
import { ResultsTracking } from "./Pages/ResultsTracking/Results2";
import { ChatsRoom1 } from "./Pages/ChatsRoom1/ChatsRoom12";
import { GroupPage } from "./Pages/Group/Group";
import { Test } from "./Pages/Test/Test2";
import { Report } from "./Pages/Report/Report2";
import { Payment } from "./Pages/Payment/Payment2";
import { CPassword } from "./Pages/CPassword/CPassword2";

// Protected route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  useRequireAuth(true);
  return <>{children}</>;
};

// Unprotected route wrapper component
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  useRequireAuth(false);
  return <>{children}</>;
};

export const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<PublicRoute><Choose /></PublicRoute>} />
        <Route path="/signin" element={<PublicRoute><Signin /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
        <Route path="/choose2" element={<PublicRoute><Choose /></PublicRoute>} />
        <Route path="/chatsroom12" element={<PublicRoute><ChatsRoom1 /></PublicRoute>} />

        {/* Protected routes */}
        <Route path="/second" element={<ProtectedRoute><Second /></ProtectedRoute>} />
        <Route path="/studying-group" element={<ProtectedRoute><StudyingGroup /></ProtectedRoute>} />
        <Route path="/chatroom" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
        <Route path="/member-area" element={<ProtectedRoute><MemberArea /></ProtectedRoute>} />
        <Route path="/setvtuber" element={<ProtectedRoute><SetVtuber /></ProtectedRoute>} />
        <Route path="/outcomes-tracking" element={<ProtectedRoute><ResultsTracking /></ProtectedRoute>} />
        <Route path="/group/:groupName" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
        <Route path="/test" element={<ProtectedRoute><Test /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        <Route path="/cpassword" element={<ProtectedRoute><CPassword /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
};
