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

import "./index.css"; // 確保導入 index.css

//const PersonalLearning = () => (
  //<div>
    //<h1>Personal Learning Page</h1>
  //</div>
//);

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
    </Routes>
  </Router>
);

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);