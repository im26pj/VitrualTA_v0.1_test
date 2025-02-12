import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Choose } from "./Pages/Choose/Choose";
import { Signin } from "./Pages/Signin/Signin";
import { Second } from "./Pages/Second/Second";
import { StudyingGroup } from "./Pages/StudyingGroup/StudyingGroup";
import { ChatRoom } from "./Pages/ChatRoom/ChatRoom";
import { PersonalLearning } from "./Pages/PersonalLearning/personal";
import { MemberArea } from "./Pages/MemberArea/member";
import { SetVtuber } from "./Pages/SetVtuber/Setvtuber";
import { SignUp } from "./Pages/Signup/Signup";
import { ResultsTracking } from "./Pages/Resultstracking/Resultstracking";
import { ChatsRoom1 } from "./Pages/ChatsRoom1/ChatsRoom1";

import "./index.css"; // 確保導入 index.css

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Choose />} />
      <Route path="/signin" element={<Signin />} />
      <Route path="/choose" element={<Choose />} />
      <Route path="/second" element={<Second />} />
      <Route path="/studying-group" element={<StudyingGroup />} />
      <Route path="/chat-room" element={<ChatRoom />} />
      <Route path="/personal-learning" element={<PersonalLearning />} />
      <Route path="/member-area" element={<MemberArea />} />
      <Route path="/setvtuber" element={<SetVtuber />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/resultstracking" element={<ResultsTracking />} />
      <Route path="/chatsroom1" element={<ChatsRoom1 />} />
    </Routes>
  </Router>
);

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);