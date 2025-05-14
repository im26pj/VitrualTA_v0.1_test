import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSSEStream } from "../../../api_servers";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const ChatsRoom1 = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleSendMessage = async () => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsLoading(true);
    setError(null);

    let assistantMessage: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      await fetchSSEStream(
        "/api/chat",
        { conversationHistory: [...messages, userMessage] },
        (content) => {
          assistantMessage.content += content;
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { ...assistantMessage },
          ]);
        },
        (error) => {
          setError(error);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "發送訊息失敗");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="bg-[#6683d2] flex justify-center w-full min-h-screen">
      <div className="bg-[#6683d2] w-full min-h-screen flex flex-col items-center">
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
        <div className="w-full bg-[#B5D1E1] py-6 px-8 flex items-center shadow-md fixed top-0 left-0 right-0 rounded-b-[28px] z-10">
          <div
            className="text-white text-3xl md:text-4xl font-kavoon cursor-pointer"
            onClick={() => handleNavigate("/choose2")}
          >
            Virtual TA
          </div>
        </div>

        {/* Chat Box */}
        <div className="w-[95%] md:w-[900px] bg-white rounded-3xl shadow-lg mt-32 md:mt-24 flex flex-col fixed top-0 bottom-0 mb-4">
          <div
            className="flex-1 overflow-y-auto p-8 md:p-12"
            style={{ height: "calc(100vh - 280px)" }}
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <img
                  className="w-[60%] md:w-[80%] max-w-[350px] h-auto mb-6"
                  alt="Pixeltrue data"
                  src="https://c.animaapp.com/fB6Gojr5/img/pixeltrue-data-analysis-1-1@2x.png"
                />
                <p className="text-lg md:text-4xl text-black font-semibold text-center font-Inknut_Antiqua-Regular">
                  What can I do for you?
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
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
                      {msg.role === "assistant" &&
                        isLoading &&
                        idx === messages.length - 1 && (
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

          <div className="p-6 border-t border-gray-200">
            {/* Mobile Buttons */}
            <div className="md:hidden">
              <div className="flex justify-between gap-2 mb-4">
                <button
                  className="flex-1 bg-[#d9d9d9] py-2 rounded-2xl text-sm font-Inknut_Antiqua-Regular"
                  onClick={() => handleNavigate("/setvtuber")}
                >
                  Visualization
                </button>
                <button
                  className="flex-1 bg-[#d9d9d9] py-2 rounded-2xl text-sm font-Inknut_Antiqua-Regular"
                  onClick={() => handleNavigate("/setvtuber")}
                >
                  Vtuber
                </button>
                <button
                  className="flex-1 bg-[#d9d9d9] py-2 rounded-2xl text-sm font-Inknut_Antiqua-Regular"
                  onClick={() => handleNavigate("/mindmap")}
                >
                  Mind Map
                </button>
              </div>
              <div className="w-full h-12 bg-[#d9d9d9] rounded-2xl flex items-center px-4">
                <span className="text-gray-700 text-xl">#</span>
                <input
                  type="text"
                  className="ml-2 flex-1 bg-transparent focus:outline-none text-lg"
                  placeholder={isLoading ? "Please wait..." : "Type your message..."}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !question.trim()}
                  className={`ml-2 ${
                    isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <img
                    className="w-6 h-6 transform rotate-90"
                    src="https://c.animaapp.com/ffsYqFjp/img/polygon-3-2.svg"
                    alt="Send"
                  />
                </button>
              </div>
            </div>

            {/* Desktop Buttons */}
            <div className="hidden md:block">
              <div className="w-full h-16 bg-[#d9d9d9] rounded-2xl flex items-center px-6 mb-4">
                <span className="text-gray-700 text-2xl">#</span>
                <input
                  type="text"
                  className="ml-2 flex-1 bg-transparent focus:outline-none text-xl"
                  placeholder={isLoading ? "Please wait..." : "Type your message..."}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !question.trim()}
                  className={`ml-4 ${
                    isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <img
                    className="w-8 h-8 transform rotate-90"
                    src="https://c.animaapp.com/ffsYqFjp/img/polygon-3-2.svg"
                    alt="Send"
                  />
                </button>
              </div>
              <div className="flex justify-start gap-4">
                <button
                  className="bg-[#d9d9d9] px-8 py-3 rounded-2xl text-xl md:text-2xl font-Inknut_Antiqua-Regular"
                  onClick={() => handleNavigate("/setvtuber")}
                >
                  Visualization
                </button>
                <button
                  className="bg-[#d9d9d9] px-8 py-3 rounded-2xl text-xl md:text-2xl font-Inknut_Antiqua-Regular"
                  onClick={() => handleNavigate("/setvtuber")}
                >
                  Vtuber
                </button>
                <button
                  className="bg-[#d9d9d9] px-8 py-3 rounded-2xl text-xl md:text-2xl font-Inknut_Antiqua-Regular"
                  onClick={() => handleNavigate("/mindmap")}
                >
                  Mind Map
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
