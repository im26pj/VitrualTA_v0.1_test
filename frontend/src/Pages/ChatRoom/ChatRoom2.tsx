import React, { JSX, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthToken } from "../../utils/auth";
import { fetchSSEStream } from "../../../api_servers";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const ChatRoom = (): JSX.Element => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showVtuberImage, setShowVtuberImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDropdownToggle = () => setShowDropdown(!showDropdown);

  const handleNavigate = (path: string) => {
    navigate(path);
    setShowDropdown(false);
  };

  const handleSignOut = () => {
    clearAuthToken();
    navigate('/signin');
  };

  const handleSendMessage = async () => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: question };
    setMessages(prev => [...prev, userMessage]); // 更新本地對話歷史
    setQuestion("");
    setIsLoading(true);
    setError(null);

    let assistantMessage: Message = { role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // 發送請求到後端，並建立 SSE 連線
      await fetchSSEStream(
        '/api/chat',
        { conversationHistory: [...messages, userMessage] }, // 傳遞對話歷史
        (content) => {
          assistantMessage.content += content; // 實時更新助理的回應
          setMessages(prev => [
            ...prev.slice(0, -1),
            { ...assistantMessage }
          ]);
        },
        (error) => {
          setError(error);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '發送訊息失敗');
    } finally {
      setIsLoading(false);
    }
  };

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

      <div className="w-full relative z-10">
        <div className="w-full bg-[#B5D1E1] py-6 px-8 flex items-center shadow-md fixed top-0 left-0 right-0 rounded-b-[28px]">
          <div
            className="text-white text-3xl md:text-4xl font-kavoon cursor-pointer"
            onClick={() => handleNavigate("/second")}
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
        {showDropdown && (
          <div className="absolute top-[100px] right-8 w-64 bg-gray-300 rounded-lg shadow-md z-20">
            <ul className="py-2">
              {[
                { label: "Account Management", path: "/member-area" },
                { label: "Learning System", path: "/chatroom" },
                { label: "Group Studying", path: "/studying-group" },
                { label: "Learning Outcomes Tracking", path: "/outcomes-tracking" },
                { label: "Setting Vtuber", path: "/setvtuber" },
                { 
                  label: "Sign Out", 
                  onClick: handleSignOut,
                  className: "text-red-600 hover:text-red-800" 
                },
              ].map((item, index) => (
                <li
                  key={index}
                  className={`px-6 py-3 text-black hover:bg-gray-400 cursor-pointer text-center font-Inknut_Antiqua-Regular ${item.className || ''}`}
                  onClick={() => item.onClick ? item.onClick() : handleNavigate(item.path)}
                >
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={`relative w-full max-w-[1100px] mt-[150px] mx-auto min-h-[calc(100vh-180px)] ${
        showVtuberImage ? "flex flex-col md:flex-row gap-4 md:gap-8" : "flex flex-col items-center w-full"
      }`}>
        {showVtuberImage && (
          <img
            className="w-full max-w-[300px] md:w-1/2 md:max-w-lg h-auto object-contain mx-auto"
            alt="Vtuber"
            src="https://c.animaapp.com/qsOI3aZQ/img/53783794637-44b575bb56-b-removebg-preview.png"
          />
        )}

        <div className={`flex flex-col flex-1 bg-white rounded-3xl px-6 pt-8 pb-32 md:pt-12 shadow-lg ${
          showVtuberImage ? "w-full md:w-1/2 max-h-[500px] md:max-h-[calc(100vh-180px)]" : "w-full max-w-[900px] max-h-[calc(100vh-180px)]"
        } relative`}>
          <div className="flex-1 overflow-y-auto mb-4">
            {messages.length === 0 && !showVtuberImage ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <img
                  className="w-[80%] max-w-[350px] h-auto"
                  alt="Intro Graphic"
                  src="https://c.animaapp.com/fB6Gojr5/img/pixeltrue-data-analysis-1-1@2x.png"
                />
                <p className="text-xl md:text-4xl text-black font-bold text-center mt-6 font-Inknut_Antiqua-Regular">
                  What can I do for you?
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 py-4 px-2">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-[#D1E8FF] self-end text-right mr-2"
                        : "bg-[#F3F3F3] self-start text-left ml-2"
                    }`}
                  >
                    <p className="text-base md:text-lg font-Inknut_Antiqua-Regular break-words">
                      {msg.content}
                      {msg.role === "assistant" && isLoading && idx === messages.length - 1 && (
                        <span className="inline-block animate-pulse">▋</span>
                      )}
                    </p>
                  </div>
                ))}
                {error && (
                  <div className="bg-red-100 text-red-600 p-4 rounded-2xl self-center">
                    {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="absolute w-[calc(100%-3rem)] bottom-6">
            <div className="w-full flex justify-between mb-4">
              <button
                className="w-[25%] h-10 md:h-12 bg-[#d9d9d9] px-0.5 py-1 rounded-2xl text-[11px] md:text-base font-Inknut_Antiqua-Regular"
                onClick={() => setShowVtuberImage(!showVtuberImage)}
              >
                Vtuber
              </button>
              <button
                className="w-[25%] h-10 md:h-12 bg-[#d9d9d9] px-0.5 py-1 rounded-2xl text-[11px] md:text-base font-Inknut_Antiqua-Regular"
                onClick={() => handleNavigate("/setvtuber")}
              >
                Visualization
              </button>
              <button
                className="w-[25%] h-10 md:h-12 bg-[#d9d9d9] px-0.5 py-1 rounded-2xl text-[11px] md:text-base font-Inknut_Antiqua-Regular"
                onClick={() => handleNavigate("/mindmap")}  
              >
                Mind Map
              </button>
            </div>

            <div className="w-full bg-[#d9d9d9] h-14 rounded-2xl flex items-center px-6">
              <div className="flex-1 flex items-center">
                <span className="text-gray-700 text-2xl">#</span>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="ml-2 w-full bg-transparent focus:outline-none text-lg"
                  placeholder={isLoading ? "Please wait..." : "Type your message..."}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !question.trim()}
                className={`flex-shrink-0 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <img
                  className="w-7 h-7 cursor-pointer rotate-90"
                  src="https://c.animaapp.com/ffsYqFjp/img/polygon-3-2.svg"
                  alt="Send"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
