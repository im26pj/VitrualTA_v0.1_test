import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// 各個頁面元件
import { Choose } from "./Pages/Choose/Choose2";
import { Signin } from "./Pages/Signin/Signin";
import { SignUp } from "./Pages/Signup/Signup";
import { Second } from "./Pages/Second/Second";
import { StudyingGroup } from "./Pages/StudyingGroup/StudyingGroup";
import { ChatRoom } from "./Pages/ChatRoom/ChatRoom2";
import { PersonalLearning } from "./Pages/PersonalLearning/Vtuber";
import { MemberArea } from "./Pages/MemberArea/Member2";
import { SetVtuber } from "./Pages/SetVtuber/Setvtuber";
import { ResultsTracking } from "./Pages/Resultstracking/Results2";
import { ChatsRoom1 } from "./Pages/ChatsRoom1/ChatsRoom12";
import { GroupPage } from "./Pages/Group/Group";
import { Test } from "./Pages/Test/Test2";
import { Report } from "./Pages/Report/Report2";
import { Payment } from "./Pages/Payment/Payment2";
import { CPassword } from "./Pages/CPassword/CPassword2";

export const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Choose />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/choose2" element={<Choose />} />
        <Route path="/second" element={<Second />} />
        <Route path="/studying-group" element={<StudyingGroup />} />
        <Route path="/chatroom" element={<ChatRoom />} />
        <Route path="/personal-learning" element={<PersonalLearning />} />
        <Route path="/member-area" element={<MemberArea />} />
        <Route path="/setvtuber" element={<SetVtuber />} />
        <Route path="/outcomes-tracking" element={<ResultsTracking />} />
        <Route path="/chatsroom12" element={<ChatsRoom1 />} />
        <Route path="/group/:groupName" element={<GroupPage />} />
        <Route path="/test" element={<Test />} />
        <Route path="/report" element={<Report />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/cpassword" element={<CPassword />} />
      </Routes>
    </Router>
  );
};
