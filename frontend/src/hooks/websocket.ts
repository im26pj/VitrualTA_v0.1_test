import { useRef, useEffect, useCallback } from "react";
import { Group } from "../types";

// hooks/websocket.ts 中的 WS_URL 設定方式需要修改
const WS_URL = import.meta.env.VITE_WS_URL || "wss://localhost:3000";
const API_URL = import.meta.env.VITE_API_URL || "https://localhost:3000";
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000;

interface WebSocketHookProps {
  // 修正 setGroups 的型別定義
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  setGroupDataMap: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setIsLoading: (loading: boolean) => void;
  setModalTitle: (title: string) => void;
  setModalMessage: (message: string) => void;
  setIsModalOpen: (open: boolean) => void;
}

export const useWebSocket = ({
  setGroups,
  setGroupDataMap,
  setIsLoading,
  setModalTitle,
  setModalMessage,
  setIsModalOpen,
}: WebSocketHookProps) => {
  // 修正 useRef 的使用，添加初始值和正確的類型
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const retryCount = useRef<number>(0);

  // 發送消息
  const sendMessage = useCallback((message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected.");
    }
  }, []);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = async () => {
      console.log("WebSocket Connected");
      retryCount.current = 0;
    /*  try {
        const res = await fetch("/api/groups");

        if (res.status === 200 || res.status === 304) {
          if (res.status === 200) {
            const groupsData = await res.json();
            // 修正: 直接設定值而不是使用函數
            setGroups(groupsData);
          } else {
            console.log("Groups data is up-to-date (304 Not Modified).");
          }
        } else {
          const errorText = await res.text();
          throw new Error(`HTTP Error: ${res.status} - ${errorText}`);
        }
      } catch (error) {
        console.error("Failed to fetch groups:", error);
      }*/
    };

    // 在 onmessage 處理中修改
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received:", data);

        switch (data.type) {
          case "new_message":
            setGroupDataMap((prev) => {
              const currentMessages = prev[data.groupId]?.messages || [];
              // 確保不重複添加相同訊息
              const messageExists = currentMessages.some(
                (msg) =>
                  msg._id === data.message._id ||
                  (msg.senderId === data.message.senderId &&
                   msg.content === data.message.content &&
                   Math.abs(new Date(msg.timestamp).getTime() - new Date(data.message.timestamp).getTime()) < 1000)
              );

              if (!messageExists) {
                return {
                  ...prev,
                  [data.groupId]: {
                    ...prev[data.groupId],
                    messages: [...currentMessages, data.message],
                  },
                };
              }
              return prev;
            });
            break;
          case "member_joined":
            setGroupDataMap((prev) => ({
              ...prev,
              [data.groupId]: {
                ...prev[data.groupId],
                members: [...(prev[data.groupId]?.members || []), data.member],
              },
            }));
            break;
          case "member_removed":
            setGroupDataMap((prev) => ({
              ...prev,
              [data.groupId]: {
                ...prev[data.groupId],
                members:
                  prev[data.groupId]?.members.filter(
                    (member) => member._id !== data.memberId
                  ) || [],
              },
            }));
            break;
          case "group_created":
            // 在 case "group_created" 中修正設定方式
            setGroups((prevGroups) => [...prevGroups, data.group]);
            break;
          case "file_uploaded":
            setGroupDataMap((prev) => ({
              ...prev,
              [data.groupId]: {
                ...prev[data.groupId],
                files: [...(prev[data.groupId]?.files || []), data.file],
              },
            }));
            break;
          case "error":
            setModalTitle("錯誤");
            setModalMessage(data.message);
            setIsModalOpen(true);
            break;
          default:
            console.log("Unknown message type:", data.type);
        }
      } catch (err) {
        console.error("Invalid WebSocket message:", err);
      } finally {
        setIsLoading(false);
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket Error:", error);
      if (retryCount.current < MAX_RETRIES) {
        console.log(`Retrying connection... Attempt ${retryCount.current + 1}`);
        setTimeout(() => {
          retryCount.current += 1;
          connect();
        }, RETRY_DELAY);
      } else {
        console.error("Failed to connect after max retries.");
        // 這裡可以加入顯示 Modal 提示的程式碼
        setModalTitle("連線錯誤");
        setModalMessage("無法連接到伺服器。請稍後再試。");
        setIsModalOpen(true);
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket Disconnected");
      if (retryCount.current < MAX_RETRIES) {
        console.log(`Reconnecting... Attempt ${retryCount.current + 1}`);
        reconnectTimeout.current = setTimeout(() => {
          retryCount.current += 1;
          connect();
        }, RETRY_DELAY);
      }
    };

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      ws.current?.close();
    };
  }, [
    setGroups,
    setGroupDataMap,
    setIsLoading,
    setModalTitle,
    setModalMessage,
    setIsModalOpen,
  ]);

  useEffect(() => {
    connect();
  }, [connect]);

  return { ws, sendMessage };
};
