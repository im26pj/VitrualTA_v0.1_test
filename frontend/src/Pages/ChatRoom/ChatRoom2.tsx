import React, { JSX, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthToken, getAuthToken } from "../../utils/auth";
import { fetchSSEStream, apiGet } from "../../../api_servers";
//有登入頁面
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatHistory {
  chat_id: string;
  title: string;
  updated_at: string;
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
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const handleDropdownToggle = () => setShowDropdown(!showDropdown);

  const handleNavigate = (path: string) => {
    navigate(path);
    setShowDropdown(false);
  };

  const handleSignOut = () => {
    clearAuthToken();
    navigate('/signin');
  };

  useEffect(() => {
    const savedChatId = localStorage.getItem('current_chat_id');
    if (!savedChatId || messages.length === 0) {
      const newChatId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setCurrentChatId(newChatId);
      localStorage.setItem('current_chat_id', newChatId);
    } else {
      setCurrentChatId(savedChatId);
    }
  }, []);

  useEffect(() => {
    const fetchChatHistories = async () => {
      try {
        // 改用 apiGet 方法
        const data = await apiGet('/api/chat/histories');
        console.log('API Response:', data); // 新增 debug 日誌
        
        if (data.success) {
          setChatHistories(data.histories);
        } else {
          console.error('Failed to fetch histories:', data.message);
        }
      } catch (err) {
        console.error('載入對話歷史失敗:', err);
        setError('載入對話歷史失敗');
      }
    };

    fetchChatHistories();
  }, []);

  const startNewChat = () => {
    const newChatId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentChatId(newChatId);
    localStorage.setItem('current_chat_id', newChatId);
    setMessages([]);
  };

  const selectChat = async (chatId: string) => {
    try {
      setCurrentChatId(chatId);
      localStorage.setItem('current_chat_id', chatId);
      
      const data = await apiGet(`/api/chat/${chatId}`);
      console.log('Selected chat data:', data); // debug log
      
      if (data.success && data.chat_history) {
        // 確保轉換格式正確
        const formattedMessages: Message[] = data.chat_history.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        }));
        setMessages(formattedMessages);
      } else {
        throw new Error(data.message || '無法載入對話');
      }
    } catch (err) {
      console.error('載入對話失敗:', err);
      setError(err instanceof Error ? err.message : '載入對話失敗');
    }
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
      const token = getAuthToken();
      if (!token) {
        throw new Error('請先登入');
      }

      await fetchSSEStream(
        "/api/chat",
        { 
          conversationHistory: [...messages, userMessage],
          isVisitor: false,
          chat_id: currentChatId,
          isNewChat: messages.length === 0
        },
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

  // 新增檢查是否在底部的函數
  const checkIfAtBottom = () => {
    const container = chatContainerRef.current;
    if (container) {
      const threshold = 100; // 接近底部的閾值（像素）
      const isBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      setIsAtBottom(isBottom);
    }
  };

  // 修改 useEffect 滾動邏輯
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  // 更新發送按鈕樣式
  const sendButtonStyle = `flex-shrink-0 transition-all duration-200 ${
    isLoading 
      ? 'opacity-50 cursor-not-allowed' 
      : !question.trim() 
        ? 'opacity-30 cursor-not-allowed' 
        : 'hover:opacity-80 cursor-pointer'
  }`;

  // 更新按鈕圖片樣式
  const sendButtonImageStyle = `w-7 h-7 ${
    isLoading || !question.trim() 
      ? 'opacity-50' 
      : 'hover:opacity-80'
  } rotate-90`;

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
        <div className="w-full bg-[#B5D1E1] py-6 px-8 flex items-center shadow-md fixed top-0 left-0 right-0 rounded-b-[28px] ">
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
              src="..\..\..\..\public\pic\2021781015212021@2x.png"
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




      <div className="flex w-full h-[calc(100vh-100px)] mt-[100px]">
        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`
            fixed top-[120px] left-4 z-20 p-2 rounded-full
            bg-white shadow-lg hover:bg-gray-100 transition-all duration-300
            ${isSidebarOpen ? 'left-[260px]' : 'left-4'}
          `}
        >
          <img
            src="../../../public/pic/bars-solid.svg"
            alt="menu"
            className="w-6 h-6"
          />
        </button>

        {/* Sidebar */}
        <div className={`
          fixed left-0 top-[100px] bottom-0 bg-white shadow-lg
          transition-all duration-300 ease-in-out z-10
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          w-[300px] rounded-tr-2xl
        `}>
          <div className="h-full overflow-hidden p-4">
            <button
              onClick={startNewChat}
              className="w-full py-3 px-4 bg-[#d9d9d9] hover:bg-gray-400 
                text-black font-Inknut_Antiqua-Regular mb-4 rounded-xl
                transition-colors duration-200"
            >
              + New Chat
            </button>

            <div className="overflow-y-auto h-[calc(100%-60px)]">
              {chatHistories.map((chat) => (
                <div
                  key={chat.chat_id}
                  onClick={() => selectChat(chat.chat_id)}
                  className={`
                    p-3 mb-2 rounded-xl cursor-pointer
                    transition-colors duration-200
                    ${currentChatId === chat.chat_id 
                      ? 'bg-[#D1E8FF] border border-[#B5D1E1]' 
                      : 'hover:bg-gray-100'
                    }
                  `}
                >
                  <div className="font-semibold truncate">{chat.title}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(chat.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`
          flex-1 transition-all duration-300 ease-in-out pt-[30px]  /* 降低頂部間距 */
          ${isSidebarOpen ? 'ml-[300px]' : 'ml-0'}
        `}>
          <div className={`relative w-full max-w-[1100px] mx-auto h-[calc(100vh-150px)] ${  /* 增加減去的高度 */
            showVtuberImage ? "flex flex-col md:flex-row gap-4 md:gap-8" : "flex flex-col items-center w-full"
          }`}>
            {showVtuberImage && (
              <img
                className="w-full max-w-[300px] md:w-1/2 md:max-w-lg h-auto object-contain mx-auto"
                alt="Vtuber"
                src="..\..\..\..\public\pic\53783794637-44b575bb56-b-removebg-preview.png"
              />
            )}

            <div className={`flex flex-col flex-1 bg-white rounded-3xl px-6 pt-8 pb-32 md:pt-12 
              ${showVtuberImage 
                ? "w-full md:w-1/2 h-[calc(100vh-250px)]"  /* 增加減去的高度 */
                : "w-full max-w-[900px] h-[calc(100vh-250px)]"  /* 增加減去的高度 */
              } relative
              border-2 border-[#B5D1E1] shadow-[0_0_15px_rgba(181,209,225,0.3)]`}>
              <div 
                className="flex-1 overflow-y-auto mb-4" 
                ref={chatContainerRef}
                onScroll={checkIfAtBottom}
                style={{ height: "calc(100% - 120px)" }}
              >
                {messages.length === 0 && !showVtuberImage ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <img
                      className="w-[80%] max-w-[350px] h-auto"
                      alt="Intro Graphic"
                      src="..\..\..\..\public\pic\pixeltrue-data-analysis-1-1@2x.png"
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
                        className={`max-w-[80%] p-4 rounded-2xl shadow-sm
                          ${msg.role === "user"
                            ? "bg-[#D1E8FF] self-end text-right mr-2 border border-[#B5D1E1]"
                            : "bg-[#F3F3F3] self-start text-left ml-2 border border-gray-200"
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

                <div className="w-full bg-[#d9d9d9] h-14 rounded-2xl flex items-center px-6 
                  border border-gray-300 focus-within:border-[#B5D1E1] focus-within:ring-2 
                  focus-within:ring-[#B5D1E1] focus-within:ring-opacity-50 transition-all duration-200">
                  <div className="flex-1 flex items-center">
                    <span className="text-gray-700 text-2xl">#</span>
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="ml-2 w-full bg-transparent focus:outline-none text-lg"
                      placeholder={isLoading ? "Model is responding..." : "Type your message..."}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && question.trim() && !isLoading) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                  </div>
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
                      src="..\..\..\..\public\pic\polygon-3-2.svg"
                      alt="Send"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
