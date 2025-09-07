import React, { useState } from "react";

interface Message {
  id: string;
  sender: string;
  content: string;
  time: string;
  type: "text" | "system";
}

interface Group {
  id: string;
  name: string;
  members: string[];
}

interface FileItem {
  id: string;
  name: string;
  url: string;
}

const GroupPage: React.FC = () => {
  // 假資料：群組 + 成員
  const [groups] = useState<Group[]>([
    { id: "study", name: "Study Group", members: ["Alice", "Bob", "Charlie"] },
    { id: "work", name: "Work Group", members: ["David", "Eva"] },
  ]);

  const [currentGroup, setCurrentGroup] = useState<Group | null>(groups[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showFiles, setShowFiles] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const sendMessage = () => {
    if (!newMessage.trim() || !currentGroup) return;
    const msg: Message = {
      id: Date.now().toString(),
      sender: "You",
      content: newMessage,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "text",
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !currentGroup) return;
    const file = e.target.files[0];
    if (file.type !== "application/pdf") {
      alert("只能上傳 PDF 檔案");
      return;
    }

    const fileItem: FileItem = {
      id: Date.now().toString(),
      name: file.name,
      url: URL.createObjectURL(file), // 模擬 URL，正式版換成後端儲存
    };

    setFiles((prev) => [...prev, fileItem]);

    // 系統訊息
    const msg: Message = {
      id: Date.now().toString() + "-sys",
      sender: "system",
      content: `📄 ${file.name} 已上傳到群組`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "system",
    };
    setMessages((prev) => [...prev, msg]);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 左側群組 & 成員 */}
      <div className="w-60 bg-gray-900 text-white flex flex-col">
        <div className="p-4 text-lg font-bold border-b border-gray-700">
          群組列表
        </div>
        <div className="flex-1 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.id}>
              <div
                onClick={() => {
                  setCurrentGroup(group);
                  setExpandedGroup(expandedGroup === group.id ? null : group.id);
                }}
                className={`p-3 cursor-pointer hover:bg-gray-700 ${
                  currentGroup?.id === group.id ? "bg-gray-700" : ""
                }`}
              >
                {group.name}
              </div>
              {expandedGroup === group.id && (
                <div className="pl-6 text-sm text-gray-300 space-y-1">
                  {group.members.map((m) => (
                    <div key={m} className="py-1">👤 {m}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 中間聊天區 */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-white shadow">
          <h2 className="text-xl font-bold">
            {currentGroup ? currentGroup.name : "選擇一個群組"}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === "You" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 rounded-lg max-w-xs ${
                  msg.type === "system"
                    ? "bg-yellow-200 text-gray-900 text-center"
                    : msg.sender === "You"
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-900"
                }`}
              >
                <p className="text-sm font-semibold">{msg.sender}</p>
                <p>{msg.content}</p>
                <p className="text-xs opacity-70 text-right">{msg.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t bg-white flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="輸入訊息..."
            className="flex-1 border rounded-l px-3 py-2 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            className="bg-green-500 hover:bg-green-600 text-white px-4 rounded-r"
          >
            發送
          </button>
        </div>
      </div>

      {/* 右側檔案區 */}
      <div className="w-72 bg-gray-200 border-l flex flex-col">
        <div
          className="p-4 font-bold border-b cursor-pointer bg-gray-300"
          onClick={() => setShowFiles(!showFiles)}
        >
          📂 已上傳檔案 {showFiles ? "▲" : "▼"}
        </div>
        {showFiles && (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between bg-white p-2 rounded shadow"
                >
                  <span className="truncate">{file.name}</span>
                  <a
                    href={file.url}
                    download={file.name}
                    className="text-blue-500 text-sm ml-2"
                  >
                    下載
                  </a>
                </div>
              ))}
            </div>
            <div className="p-3 border-t">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="w-full text-sm"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GroupPage;
