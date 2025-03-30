import React, { JSX, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const ChatRoom = (): JSX.Element => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null); // 用於自動捲到底部

  const handleDropdownToggle = () => setShowDropdown(!showDropdown);

  const handleNavigate = (path: string) => {
    navigate(path);
    setShowDropdown(false);
  };

  const handleSendMessage = () => {
    if (!question.trim()) return;

    const userMessage: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");

    // 模擬 AI 回覆（未來可串接後端）
    setTimeout(() => {
      const aiReply: Message = {
        role: "assistant",
        content: "This is a sample AI response to: " + question,
      };
      setMessages((prev) => [...prev, aiReply]);
    }, 600);
  };

  // 每次訊息更新後自動捲到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="bg-[#6683d2] flex flex-col items-center w-full min-h-screen px-4 md:px-8">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
          .font-kavoon {
            font-family: 'Kavoon', cursive;
          }
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-Inknut_Antiqua-Regular {
            font-family: 'Inknut Antiqua', serif;
          }
        `}
      </style>

      {/* Header */}
      <div className="w-full relative z-10">
        <div className="w-full bg-[#B5D1E1] py-6 px-8 flex items-center shadow-md fixed top-0 left-0 right-0 rounded-b-[28px]">
          <div
            className="text-white text-3xl md:text-4xl font-kavoon cursor-pointer"
            onClick={() => handleNavigate("/choose2")}
          >
            Virtual TA
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-white text-2xl md:text-4xl font-kavoon">
              Chat Room
            </div>
            <img
              className="w-[70px] h-[70px] object-cover cursor-pointer"
              alt="User Avatar"
              src="https://c.animaapp.com/iiDcfYsY/img/2021781015212021@2x.png"
              onClick={handleDropdownToggle}
            />
          </div>
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-[100px] right-8 w-64 bg-gray-300 rounded-lg shadow-md z-20">
            <ul className="py-2">
              {[
                { label: "Account Management", path: "/member-area" },
                { label: "Learning System", path: "/chatroom" },
                { label: "Group Studying", path: "/studying-group" },
                { label: "Learning Outcomes Tracking", path: "/outcomes-tracking" },
                { label: "Setting Vtuber", path: "/setvtuber" },
              ].map((item, index) => (
                <li
                  key={index}
                  className="px-6 py-3 text-black hover:bg-gray-400 cursor-pointer text-center font-Inknut_Antiqua-Regular"
                  onClick={() => handleNavigate(item.path)}
                >
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Chat box container */}
      <div className="relative w-full max-w-[1100px] bg-white rounded-3xl px-8 py-8 md:py-12 shadow-lg mt-32 mb-24 flex flex-col items-center mx-auto min-h-[60vh]">

        {/* 開場圖示 + 提示 */}
        {messages.length === 0 && (
          <>
            <img
              className="w-[80%] max-w-[350px] h-auto"
              alt="Intro Graphic"
              src="https://c.animaapp.com/fB6Gojr5/img/pixeltrue-data-analysis-1-1@2x.png"
            />
            <p className="text-xl md:text-4xl text-black font-bold text-center mt-6 font-Inknut_Antiqua-Regular">
              What can I do for you?
            </p>
          </>
        )}

        {/* 訊息列表區（可捲動） */}
        <div className="w-full max-w-[950px] flex flex-col gap-4 mt-4 overflow-y-auto max-h-[50vh] pr-2">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === "user"
                  ? "bg-[#D1E8FF] self-end text-right"
                  : "bg-[#F3F3F3] self-start text-left"
              }`}
            >
              <p className="text-base md:text-lg font-Inknut_Antiqua-Regular">
                {msg.content}
              </p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 輸入框固定在底部 */}
      <div className="fixed bottom-6 w-full max-w-[1100px] px-4 md:px-8 flex justify-center z-20">
        <div className="w-full bg-[#d9d9d9] h-16 rounded-2xl flex items-center px-6">
          <span className="text-gray-700 text-2xl">#</span>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="ml-2 flex-1 bg-transparent focus:outline-none text-xl"
            placeholder="Type your message..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
          />
          <img
            className="w-8 h-8 ml-4 cursor-pointer rotate-90"
            src="https://c.animaapp.com/ffsYqFjp/img/polygon-3-2.svg"
            alt="Send"
            onClick={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
};
