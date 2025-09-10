import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../../hooks/websocket";
import { Group, GroupDetails, User, Message, FileItem } from "../../types/index";

declare const __firebase_config: string;
declare const __initial_auth_token: string;

export const StudyingGroup = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [groupDataMap, setGroupDataMap] = useState<Record<string, GroupDetails>>({});
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showMembers, setShowMembers] = useState(true);
  const [showFiles, setShowFiles] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalInput, setModalInput] = useState("");
  const [modalAction, setModalAction] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);  
  const apiUrl = process.env.REACT_APP_API_URL || '';
  const { ws, sendMessage } = useWebSocket({
    setGroups,
    setGroupDataMap,
    setIsLoading,
    setModalTitle,
    setModalMessage,
    setIsModalOpen,
  });

  // ✅ 一開始就檢查登入狀態
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (err) {
        console.error("解析使用者資訊失敗:", err);
        navigate("/signin");
      }
    } else {
      navigate("/signin");
    }
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupDataMap, currentGroup]);

  // 添加初始載入群組的 useEffect
  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      
      try {
        console.log('Fetching groups for user:', user._id);

        const res = await fetch(`${apiUrl}/api/groups?userId=${user._id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const groupsData = await res.json();
        console.log('Received groups data:', groupsData);
        
        if (Array.isArray(groupsData)) {
          setGroups(groupsData);
          // 預載每個群組的詳細資料
          groupsData.forEach(async (group) => {
            try {
              const detailRes = await fetch(`${apiUrl}/api/groups/${group._id}`);
              if (detailRes.ok) {
                const details = await detailRes.json();
                setGroupDataMap(prev => ({
                  ...prev,
                  [group._id]: {
                    members: details.members,
                    files: details.files,
                    messages: details.messages || []
                  }
                }));
              }
            } catch (error) {
              console.error(`Error fetching details for group ${group._id}:`, error);
            }
          });
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };

    if (user?._id) {
      fetchGroups();
    }
  }, [user?._id]);

  // 切換群組時載入資料
  const handleSelectGroup = async (group: Group) => {
    setCurrentGroup(group);
    
    // 如果資料已載入過，直接使用
    if (groupDataMap[group._id]?.messages) {
      return;
    }

    // 否則，從後端 RESTful API 獲取群組詳細資料
    try {
      const res = await fetch(`${apiUrl}/api/groups/${group._id}`);
      if (!res.ok) throw new Error("Failed to fetch group details");
      const groupDetails = await res.json();

      console.log('Group details received:', groupDetails);
      console.log('Members:', groupDetails.members);

      const membersAsUser = groupDetails.members.map((m: { _id: string, fullname: string }) => ({
          _id: m._id,
          fullname: m.fullname
        }));

      // 更新 groupDataMap
      setGroupDataMap(prev => ({
        ...prev,
        [group._id]: {
          members: membersAsUser,
          files: groupDetails.files,
          messages: groupDetails.messages || [],
        }
      }));

    } catch (error) {
      console.error("Error fetching group details:", error);
    }
  };

  // 發送訊息
  const handleSendMessage = async () => {
    if (!question.trim() || isLoading || !currentGroup || !user) return;
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/groups/${currentGroup._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          senderId: user._id,
          content: question
        })
      });

      if (!response.ok) {
        throw new Error('發送訊息失敗');
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('訊息發送成功');
        
        // 立即添加自己的訊息到UI（樂觀更新）
        const newMessage = {
          _id: result.message._id,
          senderId: user._id,
          senderName: user.fullname,
          content: question,
          timestamp: new Date().toISOString(),
          formattedTime: formatMessageTime(new Date().toISOString())
        };
        
        setGroupDataMap(prev => ({
          ...prev,
          [currentGroup._id]: {
            ...prev[currentGroup._id],
            messages: [...(prev[currentGroup._id]?.messages || []), newMessage],
          }
        }));
        
        // 1秒後重新載入完整資料（確保同步）
        setTimeout(() => {
          refreshGroupData(currentGroup._id);
        }, 1000);
      }
    } catch (error) {
      console.error('發送訊息失敗:', error);
      setModalTitle("錯誤");
      setModalMessage("發送訊息失敗，請稍後再試。");
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
    
    setQuestion("");
  };

  // 重新載入群組資料
  const refreshGroupData = async (groupId: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) throw new Error("Failed to fetch group details");
      
      const groupDetails = await res.json();
      
      setGroupDataMap(prev => ({
        ...prev,
        [groupId]: {
          members: groupDetails.members.map((m: any) => ({
            _id: m._id,
            fullname: m.fullname
          })),
          files: groupDetails.files,
          messages: groupDetails.messages || [],
        }
      }));
      
      console.log('群組資料已更新，訊息數量:', groupDetails.messages?.length);
    } catch (error) {
      console.error("重新載入群組資料失敗:", error);
    }
  };

  // 監聽成員變化
  useEffect(() => {
    if (!currentGroup) return;
    
    // 每5秒檢查一次當前群組的資料變化
    const interval = setInterval(() => {
      refreshGroupData(currentGroup._id);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [currentGroup]);

  // 格式化訊息時間顯示
  const formatMessageTime = (timestamp: string | Date) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      
      // 檢查日期是否有效
      if (isNaN(date.getTime())) return '';
      
      // 檢查是否為今天
      const isToday = date.toDateString() === now.toDateString();
      
      if (isToday) {
        // 今天：只顯示時:分
        return date.toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      } else {
        // 其他日期：顯示月/日 時:分
        return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${date.toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })}`;
      }
    } catch (error) {
      console.error('時間格式化錯誤:', error);
      return '';
    }
  };

  // 獲取成員名稱
  const getMemberName = (senderId: string) => {
    const member = currentGroupData?.members.find(m => m._id === senderId);
    return member ? member.fullname : '未知使用者';
  }

  // 處理自訂彈窗的取消動作
  const handleModalCancel = () => {
    setIsModalOpen(false);
    setModalInput("");
    setModalAction(null);
    setModalMessage(null);
  };

  // 處理自訂彈窗的確認動作
  const handleModalAction = async () => {
    if (modalAction === 'create_group') {
      if (!modalInput.trim()) {
        setModalMessage("群組名稱不能為空。");
        setIsModalOpen(true);
        return;
      }
      if (!user) {
        setModalMessage("使用者未登入，請重新登入。");
        setIsModalOpen(true);
        return;
      }

      try {
        const res = await fetch(`${apiUrl}/api/groups`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ name: modalInput, ownerId: user._id }),
        });
        
        if (!res.ok) {
          throw new Error('創建群組失敗');
        }
        
        const data = await res.json();

        const newGroup = {
          _id: data._id,
          name: data.name,
          code: data.code,
          ownerId: data.ownerId
        };

        setGroups(prev => [...prev, newGroup]);
        handleSelectGroup(newGroup);

      } catch (error) {
        console.error("Failed to create group:", error);
        setModalTitle("錯誤");
        setModalMessage("創建群組失敗，請稍後再試。");
        setIsModalOpen(true);
        return;
      }
    } 
    else if (modalAction === 'join_group') {
      if (!modalInput.trim()) {
        setModalMessage("群組代碼不能為空。");
        setIsModalOpen(true);
        return;
      }
      if (!user) {
        setModalMessage("使用者未登入，請重新登入。");
        setIsModalOpen(true);
        return;
      }

      try {
        const groupCode = modalInput.trim(); // 保持原始輸入，不轉換大小寫
        
        console.log('發送加入群組請求:', { 
          url: `${apiUrl}/api/groups/join/${groupCode}`,
          userId: user._id 
        });

        // 修改：將群組代碼放在 URL 路徑中
        const res = await fetch(`${apiUrl}/api/groups/join/${groupCode}`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ userId: user._id }),
        });

        console.log('API 回應狀態:', res.status);
        
        if (!res.ok) {
          const errorData = await res.json();
          console.log('API 錯誤回應:', errorData);
          
          if (res.status === 404) {
            setModalTitle("錯誤");
            setModalMessage("群組代碼無效，找不到對應的群組。");
            setIsModalOpen(true);
            return;
          }
          throw new Error('加入群組失敗');
        }

        const joinedGroup = await res.json();
        console.log('加入群組成功:', joinedGroup);

        if (joinedGroup.alreadyMember) {
          // 如果已經是成員，顯示訊息並跳轉到該群組
          setModalTitle("提示");
          setModalMessage(joinedGroup.message);
          setIsModalOpen(true);
          
          // 找到該群組並選中
          const existingGroup = groups.find(g => g._id === joinedGroup._id);
          if (existingGroup) {
            handleSelectGroup(existingGroup);
          } else {
            // 如果本地沒有該群組，添加到群組列表
            setGroups(prev => [...prev, joinedGroup]);
            handleSelectGroup(joinedGroup);
          }
        } else {
          // 新加入的群組
          setModalTitle("成功");
          setModalMessage(joinedGroup.message);
          setIsModalOpen(true);

          // 確保群組詳細資訊也被正確儲存
          setGroupDataMap(prev => ({
            ...prev,
            [joinedGroup._id]: {
              members: joinedGroup.members,
              files: joinedGroup.files || [],
              messages: joinedGroup.messages || []
            }
          }));

          setGroups(prev => {
            const exists = prev.find(g => g._id === joinedGroup._id);
            if (exists) {
              handleSelectGroup(exists);
              return prev;
            }
            handleSelectGroup(joinedGroup);
            return [...prev, joinedGroup];
          });
        }
      } catch (error) {
        console.error("加入群組失敗:", error);
        setModalTitle("錯誤");
        setModalMessage("加入群組失敗，請稍後再試。");
        setIsModalOpen(true);
        return;
      }
    } 
    else if (modalAction === 'leave_group') {
      if(currentGroup) {
        try {
          const res = await fetch(`${apiUrl}/api/groups/${currentGroup._id}/leave`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userId: user?._id }),
          });

          if (!res.ok) {
            throw new Error('離開群組失敗');
          }

          setGroups(prev => prev.filter(g => g._id !== currentGroup._id));
          setCurrentGroup(null);
          setGroupDataMap(prev => {
            const newGroupData = { ...prev };
            delete newGroupData[currentGroup._id];
            return newGroupData;
          });
        } catch (error) {
          console.error("離開群組失敗:", error);
          setModalTitle("錯誤");
          setModalMessage("離開群組失敗，請稍後再試。");
          setIsModalOpen(true);
          return;
        }
      }
    }

    // 重置狀態
    setIsModalOpen(false);
    setModalInput("");
    setModalAction(null);
    setModalMessage(null);
  };

  const handleCreateGroup = () => {
    setModalTitle("新增群組");
    setModalMessage("請輸入新群組名稱：");
    setModalAction("create_group");
    setIsModalOpen(true);
  };

  const handleJoinGroup = () => {
    setModalTitle("加入群組");
    setModalMessage("請輸入要加入的群組代碼：");
    setModalAction("join_group");
    setIsModalOpen(true);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentGroup) return;
    try {
      const res = await fetch(`/api/groups/${currentGroup._id}/removeMember`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      if (!res.ok) throw new Error('移除成員失敗');
      
      const updatedGroup = await res.json();
      
      // 更新 groupDataMap 中的成員列表
      setGroupDataMap(prev => ({
        ...prev,
        [currentGroup._id]: {
          ...prev[currentGroup._id],
          members: updatedGroup.members
        }
      }));
    } catch (err) {
      console.error(err);
      setModalTitle("錯誤");
      setModalMessage("移除成員失敗，請稍後再試。");
      setIsModalOpen(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !currentGroup) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/upload?groupId=${currentGroup._id}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error('File upload failed.');
      }

      const data = await res.json();
      const newFile: FileItem = { name: data.fileName, url: `/pic${data.fileUrl}` };

      setGroupDataMap(prev => ({
        ...prev,
        [currentGroup._id]: {
          ...prev[currentGroup._id],
          files: [...(prev[currentGroup._id]?.files || []), newFile],
        }
      }));

    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const handleLeaveGroup = () => {
    setModalTitle("確認");
    setModalMessage("您確定要退出此群組嗎？");
    setModalAction("leave_group");
    setIsModalOpen(true);
  };
  
  const currentGroupData = currentGroup ? groupDataMap[currentGroup._id] : null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#6683d2] font-inknut">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-kavoon {
            font-family: 'Kavoon', cursive;
          }
          .font-inknut {
            font-family: 'Inknut Antiqua', serif;
          }
          .custom-scrollbar::-webkit-scrollbar {
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
        `}
      </style>

      {/* Header */}
      <header className="w-full relative z-10">
        <div className="w-full bg-[#B5D1E1] py-6 px-8 flex items-center shadow-md rounded-b-[28px]">
          <h1
            className="text-white text-3xl md:text-4xl font-kavoon cursor-pointer"
            onClick={() => navigate("/second")}
          >
            Virtual TA
          </h1>

          <div className="ml-auto flex items-center gap-4 relative">
            <span className="text-white text-2xl md:text-4xl font-kavoon">
              Group Studying
            </span>
            <img
              className="w-[70px] h-[70px] object-cover cursor-pointer rounded-full"
              alt="User Avatar"
              src={`/pic/2021781015212021.png`}
              onClick={() => setShowDropdown(!showDropdown)}
            />

            {showDropdown && (
              <div className="absolute top-[80px] right-0 w-64 bg-gray-300 rounded-lg shadow-md z-20">
                <ul className="py-2">
                  {[
                    { label: "Account Management", path: "/member-area" },
                    { label: "Learning System", path: "/chatroom" },
                    { label: "Group Studying", path: "/studying-group" },
                    { label: "Learning Outcomes Tracking", path: "/outcomes-tracking" },
                    { label: "Setting Vtuber", path: "/setvtuber" },
                    { label: "Sign Out", path: "/signin", signout: true },
                  ].map((item, index) => (
                    <li
                      key={index}
                      className={`px-6 py-3 text-black hover:bg-gray-400 cursor-pointer text-center font-inknut ${
                        item.signout ? "text-red-600" : ""
                      }`}
                      onClick={() =>
                        item.signout
                          ? (localStorage.removeItem("token"), navigate(item.path))
                          : navigate(item.path)
                      }
                    >
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主內容區 */}
      <div className="flex flex-1 p-8 h-[calc(100vh-132px)] overflow-hidden">
        {/* 左側群組清單 */}
        <div className="w-64 bg-[#ECEFF1] rounded-l-[28px] shadow-lg flex flex-col">
          <div className="p-4 flex flex-col h-full">
            <h2 className="text-lg font-bold mb-4 text-black">Groups</h2>
            <div className="flex-1 overflow-y-auto custom-scrollbar mb-4 h-[calc(100vh-300px)]">
              {groups.map((g) => (
                <div
                  key={g._id}
                  onClick={() => handleSelectGroup(g)}
                  className={`px-4 py-3 cursor-pointer rounded-lg mb-2 transition-colors ${
                    g._id === currentGroup?._id ? "bg-[#CFD8DC] text-black" : "hover:bg-gray-200"
                  }`}
                >
                  {g.name}
                </div>
              ))}
            </div>
            <div className="mt-auto pt-4 border-t border-gray-300">
              <button
                className="w-full bg-blue-500 py-2 rounded-lg mb-2 text-white hover:bg-blue-600 transition-colors"
                onClick={handleCreateGroup}
              >
                ➕ 新增群組
              </button>
              <button
                className="w-full bg-green-500 py-2 rounded-lg text-white hover:bg-green-600 transition-colors"
                onClick={handleJoinGroup}
              >
                🔗 加入群組
              </button>
            </div>
          </div>
        </div>

        {/* 中間聊天室 */}
        <div className="flex-1 flex flex-col bg-white shadow-lg mx-4">
          <div className="text-center p-4 border-b border-gray-200">
            {currentGroup ? (
              <p className="text-lg font-bold">
                {currentGroup.name} ({currentGroup.code})
              </p>
            ) : (
              <p className="text-gray-500">請在左側選擇或創建一個群組</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 h-[calc(100vh-280px)]">
            {currentGroupData?.messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-4 ${
                  msg.senderId === user?._id ? "flex justify-end" : "flex justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-lg ${
                    msg.senderId === user?._id 
                      ? "bg-blue-200 rounded-br-sm" 
                      : "bg-blue-200 rounded-br-sm"
                  }`}
                >
                  {/* 名稱和時間區域 - 統一置左 */}
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-bold text-sm">
                      {msg.senderName || getMemberName(msg.senderId)}
                    </span>
                    <span className={`text-xs ${
                      msg.senderId === user?._id ? "text-gray-500" : "text-gray-500"
                    }`}>
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>
                  
                  {/* 訊息內容 */}
                  <div className="text-sm leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex">
              <textarea
                className="flex-1 border rounded-lg p-2"
                rows={1}
                placeholder={currentGroup ? "輸入訊息..." : "請先選擇一個群組"}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={!currentGroup || isLoading}
              />
              <button
                onClick={handleSendMessage}
                className={`ml-2 px-4 rounded transition-colors ${
                  !currentGroup || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                disabled={!currentGroup || isLoading}
              >
                {isLoading ? '發送中...' : '發送'}
              </button>
            </div>
          </div>
        </div>

        {/* 右側欄 */}
        {currentGroup && (
          <div className="w-72 bg-[#ECEFF1] rounded-r-[28px] shadow-lg flex flex-col">
            <div className="p-4 flex flex-col h-full">
              {showFiles && (
                <div className="mb-3 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer">
                  <label className="cursor-pointer w-full inline-block">
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      onChange={handleFileUpload}
                      className="hidden" 
                    />
                    📎 選擇檔案上傳
                  </label>
                </div>
              )}
              
              <button
                className="p-3 bg-gray-300 border-b border-gray-400 text-left rounded-t-lg hover:bg-gray-400 transition-colors"
                onClick={() => setShowFiles(!showFiles)}
              >
                📂 檔案 ({currentGroupData?.files.length || 0})
              </button>

              {showFiles && (
                <div className="overflow-y-auto custom-scrollbar h-[calc(30vh)]">
                  <ul className="space-y-2 p-3">
                    {currentGroupData?.files.map((f, i) => (
                      <li key={i}>
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          {f.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                className="p-3 bg-gray-300 border-b border-gray-400 text-left hover:bg-gray-400 transition-colors mt-2"
                onClick={() => setShowMembers(!showMembers)}
              >
                👥 成員 ({currentGroupData?.members.length || 0})
              </button>

              {showMembers && (
                <div className="overflow-y-auto custom-scrollbar h-[calc(40vh)]">
                  <ul className="space-y-1 p-3">
                    {currentGroupData?.members.map((member, i) => (
                      <li key={i} className="flex justify-between items-center">
                        <span>{member.fullname}</span>
                        {user?._id?.toString() === currentGroup?.ownerId?.toString() &&
                        member._id?.toString() !== currentGroup?.ownerId?.toString() && (
                          <button 
                            onClick={() => handleRemoveMember(member._id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            移除
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-gray-300">
                <button
                  className="w-full bg-red-500 py-2 rounded-lg text-white hover:bg-red-600 transition-colors"
                  onClick={handleLeaveGroup}
                >
                  🚪 退出群組
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 自訂彈窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-80">
            <h3 className="text-lg font-bold mb-4">{modalTitle}</h3>
            <p className="text-sm text-gray-700 mb-4">{modalMessage}</p>
            {modalAction !== 'leave_group' && (
              <input
                type="text"
                className="w-full border border-gray-300 p-2 rounded mb-4"
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
              />
            )}
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                onClick={handleModalCancel}
              >
                取消
              </button>
              <button
                className="px-4 py-2 bg-blue-500 rounded-lg text-white hover:bg-blue-600"
                onClick={handleModalAction}
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};