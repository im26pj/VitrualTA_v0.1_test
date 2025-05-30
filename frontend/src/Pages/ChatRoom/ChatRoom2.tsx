import React, { JSX, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthToken, getAuthToken } from "../../utils/auth";
import { fetchSSEStream, apiGet, uploadImage, getImageUrl, deleteImage } from "../../../api_servers";
//有登入頁面
interface MessageImage {
  fileId: string;
  filename: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  img_id?: string[];
  images?: {
    fileId: string;
    filename: string;
    base64?: string;
  }[];
}

interface ChatHistory {
  chat_id: string;
  title: string;
  updated_at: string;
}

interface UploadingImage {
  id: string;
  file: File;
  preview?: string;
  name: string;
}

// Add new interfaces
interface PendingImage {
  fileId: string;
  filename: string;
  base64: string;
}

interface UploadImageResponse {
  success: boolean;
  images: Array<{
    fileId: string;
    filename: string;
    base64: string;
  }>;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // 新增預覽圖片狀態
  const [previewImage, setPreviewImage] = useState<UploadingImage | null>(null);

  // 新增待上傳圖片狀態
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

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
        //console.log('API Response:', data); // 新增 debug 日誌
        
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
      const data = await apiGet(`/api/chat/${chatId}`);
      
      if (data.success && data.chat_history) {
        const formattedMessages: Message[] = data.chat_history.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          img_id: msg.img_id,  // 這裡有 img_id
          images: msg.img_id ? msg.img_id.map((id: string) => ({  // 修改這裡
            fileId: id,
            filename: `Image ${id}`  // 或從其他地方獲取文件名
          })) : undefined
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

  // 修改檔案上傳處理函數
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      const fileArray = Array.from(files);
      
      fileArray.forEach(file => {
        formData.append('images', file);
      });
      
      if (currentChatId) {
        formData.append('chat_id', currentChatId);
      }

      const result = await uploadImage(formData);

      if (result.success && result.images?.length > 0) {
        const newImages = result.images.map((img, index) => ({
          id: img.fileId,
          file: fileArray[index],
          name: fileArray[index].name,
          preview: URL.createObjectURL(fileArray[index])
        }));

        setUploadingImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('上傳失敗:', error);
      setError('圖片上傳失敗');
    } finally {
      setIsUploading(false);
    }
  };

  // Add function to handle image deletion
  const handleDeletePendingImage = async (fileId: string) => {
    try {
      await deleteImage(fileId);
      setPendingImages(prev => prev.filter(img => img.fileId !== fileId));
      setPreviewImage(null);
    } catch (err) {
      setError('刪除圖片失敗');
    }
  };

  // 新增刪除圖片處理函數
  const handleDeleteImage = async (imageId: string) => {
    try {
      await deleteImage(imageId);
      setUploadingImages(prev => prev.filter(img => img.id !== imageId));
      // 清理 URL.createObjectURL 創建的 URL
      const image = uploadingImages.find(img => img.id === imageId);
      if (image?.preview) {
        URL.revokeObjectURL(image.preview);
      }
    } catch (error) {
      console.error('刪除圖片失敗:', error);
      setError('刪除圖片失敗');
    }
  };

  const handleSendMessage = async () => {
    if (!question.trim() || isLoading || isUploading) return;

    // 保存當前的圖片 IDs，因為我們馬上要清除 uploadingImages
    const currentImageIds = uploadingImages.map(img => img.id);

    const userMessage: Message = {
      role: "user",
      content: question,
      img_id: currentImageIds,
      images: uploadingImages.map(img => ({
        fileId: img.id,
        filename: img.name
      }))
    };

    // 在發送前先清除輸入和預覽
    setMessages(prev => [...prev, userMessage]);
    setQuestion("");
    setIsLoading(true);
    setError(null);

    // 清理所有預覽圖片
    uploadingImages.forEach(img => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    // 清空上傳圖片列表
    setUploadingImages([]);

    try {
      const messageData = {
        conversationHistory: [...messages, userMessage],
        chat_id: currentChatId,
        isVisitor: false,
        isNewChat: messages.length === 0,
        img_id: currentImageIds // 使用保存的圖片 IDs
      };

      await fetchSSEStream(
        "/api/chat",
        messageData,
        (content) => {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === "assistant") {
              return [...prev.slice(0, -1), { ...lastMessage, content: lastMessage.content + content }];
            } else {
              return [...prev, { role: "assistant", content }];
            }
          });
        },
        (error) => setError(error)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "發送訊息失敗");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // 修改 handleDrop 函數
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      await handleFileUpload(e.dataTransfer.files);
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
    isLoading || isUploading || !question.trim()
      ? 'opacity-50 cursor-not-allowed' 
      : 'hover:opacity-80 cursor-pointer'
  }`;

  // 更新按鈕圖片樣式
  const sendButtonImageStyle = `w-7 h-7 ${
    isLoading || !question.trim() 
      ? 'opacity-50' 
      : 'hover:opacity-80'
  } rotate-90`;

  // 修改消息渲染部分
  const renderMessage = (msg: Message, idx: number) => (
    <div className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"} mb-4`}>
      <div className={`max-w-[80%] ${
        msg.role === "assistant" 
          ? "bg-gray-100 rounded-r-lg rounded-bl-lg ml-2" 
          : "bg-blue-100 rounded-l-lg rounded-br-lg mr-2"
      } p-4`}>
        {/* 圖片區塊 */}
        {msg.images && msg.images.length > 0 && (
          <div className="mb-3 space-y-2">
            {msg.images.map((img, imgIdx) => (
              <div key={imgIdx} className="relative">
                <img
                  src={getImageUrl(img.fileId)}
                  alt={img.filename}
                  className="max-w-full rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = "..\\..\\..\\..\\public\\pic\\error-image.png";
                  }}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* 文字內容區塊 */}
        <div className="text-base md:text-lg font-Inknut_Antiqua-Regular break-words">
          {msg.content}
          {msg.role === "assistant" && isLoading && idx === messages.length - 1 && (
            <span className="inline-block animate-pulse">▋</span>
          )}
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    return () => {
      uploadingImages.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, [uploadingImages]);

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
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
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
                    {messages.map((msg, idx) => renderMessage(msg, idx))}
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

                <div className="flex flex-col gap-2">
                  <div className={`w-full bg-[#d9d9d9] h-14 rounded-2xl flex items-center px-6 
                    border border-gray-300 focus-within:border-[#B5D1E1] focus-within:ring-2 
                    focus-within:ring-[#B5D1E1] focus-within:ring-opacity-50 transition-all duration-200
                    ${isDragging ? 'border-blue-500 bg-blue-50' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                    <div className="flex items-center flex-1">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-gray-700 text-2xl hover:text-gray-900 cursor-pointer px-2"
                      >
                        #
                      </button>
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="ml-2 w-full bg-transparent focus:outline-none text-lg"
                        placeholder={isLoading ? "Model is responding..." : "Type your message or drag & drop an image..."}
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

                  {/* 新增圖片預覽區域 */}
                  {uploadingImages.map((image) => (
                    <div key={image.id} className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-lg">
                      {image.preview && (
                        <img 
                          src={image.preview}
                          alt={image.name}
                          className="w-6 h-6 object-contain"
                        />
                      )}
                      <span className="text-sm text-gray-600">{image.name}</span>
                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        className="ml-auto text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
