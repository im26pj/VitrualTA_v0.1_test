import React from "react";
import "../tailwind.css";
import "../global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Choose } from "./Pages/Choose/Choose";
import { Second } from "./Pages/Second/Second";
import { Signin } from "./Pages/Signin/Signin";
import { StudyingGroup } from "./Pages/StudyingGroup/StudyingGroup";
import { ChatRoom } from "./Pages/ChatRoom/ChatRoom";
import { PersonalLearning } from "./Pages/PersonalLearning/personal";
import { MemberArea } from "./Pages/MemberArea/member";
import { SetVtuber } from "./Pages/SetVtuber/Setvtuber";
import { SignUp } from "./Pages/Signup/Signup";
import { ChatsRoom1 } from "./Pages/ChatsRoom1/ChatsRoom1";
import { ResultsTracking } from "./Pages/Resultstracking/Resultstracking";
createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <div className="p-4">
      <Choose />
    </div>
  </StrictMode>,
);
createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <PersonalLearning />
  </StrictMode>,
);
createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <MemberArea />
  </StrictMode>,
);