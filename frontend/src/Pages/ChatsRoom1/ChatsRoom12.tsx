import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSSEStream } from "../../api_servers";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

//訪客版
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
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  // 修改 handleSendMessage 函數
  const handleSendMessage = async () => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: question };
    
    // 合併為一步操作：添加用戶訊息和空的 assistant 訊息
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setQuestion("");
    setIsLoading(true);
    setError(null);

    try {
      const visitorId = localStorage.getItem('visitor_id') || `visitor-${uuidv4()}`;
      localStorage.setItem('visitor_id', visitorId);
      
      await fetchSSEStream(
        "/api/chat",
        { 
          conversationHistory: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          chat_id: visitorId,
          isVisitor: true,
          isNewChat: messages.length === 0
        },
        (content) => {
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === "assistant") {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + content },
              ];
            }
            return prev;
          });
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

  const checkIfAtBottom = () => {
    const container = chatContainerRef.current;
    if (container) {
      const threshold = 100;
      const isBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      setIsAtBottom(isBottom);
    }
  };

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  // 更新發送按鈕和圖片樣式
  const sendButtonStyle = `flex-shrink-0 transition-all duration-200 ${
    isLoading 
      ? 'opacity-50 cursor-not-allowed' 
      : !question.trim() 
        ? 'opacity-30 cursor-not-allowed' 
        : 'hover:opacity-80 cursor-pointer'
  }`;

  const sendButtonImageStyle = `w-7 h-7 ${
    isLoading || !question.trim() 
      ? 'opacity-50' 
      : 'hover:opacity-80'
  } rotate-90`;

  return (
    <div className="bg-[#6683d2] flex justify-center w-full min-h-screen">
      <div className="bg-[#6683d2] w-full min-h-screen flex flex-col items-center">
        {/* 在 style 標籤中添加以下 CSS */}
        <style>
          {`
          @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-kavoon {
            font-family: 'Kavoon', cursive;
          }
          .font-inknut {
            font-family: 'Inknut Antiqua', serif;
          }.custom-scrollbar::-webkit-scrollbar {
              width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
              background: #e0e0e0;
              border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #888;
              border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #555;
          }
  
          /* 新增的打字動畫樣式 */
          .typing-indicator {
            display: inline-flex;
            align-items: center;
            background-color: rgba(181, 209, 225, 0.15);
            border-radius: 1rem;
            padding: 0.5rem 0.75rem;
          }
  
          .typing-dot {
            display: inline-block;
            width: 0.5rem;
            height: 0.5rem;
            margin: 0 0.15rem;
            background-color: #6683d2;
            border-radius: 50%;
            opacity: 0.7;
          }
  
          .typing-dot:nth-child(1) {
            animation: typing-animation 1.4s infinite ease-in-out -0.32s;
          }
  
          .typing-dot:nth-child(2) {
            animation: typing-animation 1.4s infinite ease-in-out -0.16s;
          }
  
          .typing-dot:nth-child(3) {
            animation: typing-animation 1.4s infinite ease-in-out;
          }
  
          @keyframes typing-animation {
            0%, 80%, 100% { 
              transform: scale(0.7);
            }
            40% { 
              transform: scale(1);
              opacity: 1;
            }
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
            className="flex-1 overflow-y-auto mb-4"
            ref={chatContainerRef}
            onScroll={checkIfAtBottom}
            style={{ height: "calc(100% - 120px)" }}
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <img
                  className="w-[60%] md:w-[80%] max-w-[350px] h-auto mb-6"
                  alt="Pixeltrue data"
                  src="/pic/pixeltrue-data-analysis-1-1@2x.png"
                />
                <p className="text-lg md:text-4xl text-black font-semibold text-center font-Inknut_Antiqua-Regular">
                  What can I do for you?
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 py-4 px-2">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[80%] p-4 rounded-2xl shadow-sm
                      ${msg.role === "user"
                        ? "bg-[#D1E8FF] self-end text-right mr-2 border border-[#B5D1E1]"
                        : "bg-[#F3F3F3] self-start text-left ml-2 border border-gray-200"
                      }`}
                  >
                    <div className="text-base md:text-lg font-Inknut_Antiqua-Regular break-words prose prose-slate max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // 自定義程式碼區塊樣式
                          code: ({node, inline, className, children, ...props}) => {
                            if (inline) {
                              return (
                                <code className="bg-gray-100 rounded px-1 py-0.5" {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <div className="bg-gray-100 rounded-lg p-3 my-2">
                                <code className="block whitespace-pre-wrap" {...props}>
                                  {children}
                                </code>
                              </div>
                            );
                          },
                          // 保持換行並對齊
                          p: ({children}) => (
                            <p className={`whitespace-pre-wrap mb-2 ${
                              msg.role === "user" ? "text-right" : "text-left"
                            }`}>
                              {children}
                            </p>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      
                      {/* 替換原本的加載動畫，使用新的打字指示器 */}
                      {msg.role === "assistant" && isLoading && idx === messages.length - 1 && !msg.content && (
                        <div className="typing-indicator mt-2">
                          <span className="typing-dot"></span>
                          <span className="typing-dot"></span>
                          <span className="typing-dot"></span>
                        </div>
                      )}
                    </div>
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
                <textarea
                  className="ml-2 flex-1 bg-transparent focus:outline-none text-lg resize-none"
                  placeholder={isLoading ? "Model is responding..." : "Type your message..."}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (e.shiftKey) {
                        // Shift + Enter 換行
                        return;
                      } else if (!isLoading && question.trim()) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }
                  }}
                  rows={1}
                  style={{ 
                    height: 'auto',
                    minHeight: '24px',
                    maxHeight: '120px'
                  }}
                />
                <button
                  onClick={() => {
                    if (!isLoading && question.trim()) {
                      handleSendMessage();
                    }
                  }}
                  className={sendButtonStyle}
                >
                  <img
                    className={sendButtonImageStyle}
                    src="/pic/polygon-3-2.svg"
                    alt="Send"
                  />
                </button>
              </div>
            </div>

            {/* Desktop Buttons */}
            <div className="hidden md:block">
              <div className="w-full h-16 bg-[#d9d9d9] rounded-2xl flex items-center px-6 mb-4">
                <span className="text-gray-700 text-2xl">#</span>
                <textarea
                  className="ml-2 flex-1 bg-transparent focus:outline-none text-xl resize-none"
                  placeholder={isLoading ? "Model is responding..." : "Type your message..."}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (e.shiftKey) {
                        // Shift + Enter 換行
                        return;
                      } else if (!isLoading && question.trim()) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }
                  }}
                  rows={1}
                  style={{ 
                    height: 'auto',
                    minHeight: '24px',
                    maxHeight: '120px'
                  }}
                />
                <button
                  onClick={() => {
                    if (!isLoading && question.trim()) {
                      handleSendMessage();
                    }
                  }}
                  className={sendButtonStyle}
                >
                  <img
                    className={sendButtonImageStyle}
                    src="/pic/polygon-3-2.svg"
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
