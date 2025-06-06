import React, { JSX, useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthToken, getAuthToken } from "../../utils/auth";
import { fetchSSEStream, apiGet, uploadImage, getImageUrl, deleteImage, generateGraph, deleteChatHistory } from "../../../api_servers";
import { SystemContextDiagram } from '../Graph/SCD';
import { MindMap } from '../Graph/mindmap';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as d3 from 'd3';

//有登入頁面
interface MessageImage {
  fileId: string;
  filename: string;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  img_id?: string[];
  images?: {
    fileId: string;
    filename: string;
    base64?: string;
  }[];
  graph_json?: {
    name?: string;
    children?: any[];
    nodes?: any[];
    links?: any[];
  };
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

// Add this interface for graph responses
interface GraphResponse {
  type: 'graph';
  content: {
    name?: string;
    children?: any[];
    nodes?: any[];
    links?: any[];
  };
}

// 在檔案頂部添加此介面
interface CodeComponentProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;  // 修改為可選型別
  props?: any;  // 添加這個來接收其他可能的屬性
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

  // 在 GraphRenderer 組件中添加以下狀態
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [isAddingNode, setIsAddingNode] = useState(false);

  // 新增刪除對話確認狀態
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
      setIsLoading(true);
      const data = await apiGet(`/api/chat/${chatId}`);
      
      if (data.success && data.chat_history) {
        // 首先映射消息並設置基本屬性
        const formattedMessages: Message[] = await Promise.all(data.chat_history.map(async (msg: any) => {
          const formattedMsg: Message = {
            role: msg.role,
            content: msg.content,
            img_id: msg.img_id,
            graph_json: msg.graph_json
          };
          
          // 如果有圖片ID，設置圖片資訊
          if (msg.img_id && msg.img_id.length > 0) {
            formattedMsg.images = msg.img_id.map((id: string) => ({
              fileId: id,
              filename: `圖片 ${id.substring(0, 8)}...`
            }));
          }
          
          return formattedMsg;
        }));
        
        setCurrentChatId(chatId);
        localStorage.setItem('current_chat_id', chatId);
        setMessages(formattedMessages);
      } else {
        throw new Error(data.message || '無法載入對話');
      }
    } catch (err) {
      console.error('載入對話失敗:', err);
      setError(err instanceof Error ? err.message : '載入對話失敗');
    } finally {
      setIsLoading(false);
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

    // 保存當前的圖片 IDs
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
    setMessages(prev => [...prev, userMessage, { role: "assistant", content: "" }]);
    setQuestion("");
    setIsLoading(true);
    setError(null);

    // 清理所有預覽圖片
    uploadingImages.forEach(img => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    setUploadingImages([]);

    try {
      const messageData = {
        conversationHistory: [...messages, userMessage],
        chat_id: currentChatId,
        isVisitor: false,
        isNewChat: messages.length === 0,
        img_id: currentImageIds
      };

      await fetchSSEStream(
        "/api/chat",
        messageData,
        (content: any) => {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === "assistant") {
              // 檢查是否為圖表數據
              if (typeof content === 'object' && content.type === 'graph') {
                return [...prev.slice(0, -1), {
                  ...lastMessage,
                  graph_json: content.content,  // 直接使用圖表數據
                  content: lastMessage.content || ''
                }];
              }
              // 一般文字內容
              return [...prev.slice(0, -1), {
                ...lastMessage,
                content: lastMessage.content + (typeof content === 'string' ? content : '')
              }];
            }
            return [...prev, {
              role: "assistant",
              content: typeof content === 'string' ? content : ''
            }];
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

  // 修改 GraphRenderer 組件
  const GraphRenderer: React.FC<{ data: any, mode: 'graph' | 'mindmap' }> = ({ data, mode }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // 設定基準尺寸
    const defaultDimensions = { width: 800, height: 500 }; // 增大基準尺寸
    // 使用 state 來追蹤實際尺寸
    const [dimensions, setDimensions] = useState(defaultDimensions);

    // 當容器大小變化時重新渲染圖表
    const updateSize = useCallback(() => {
      if (!containerRef.current) return;
      
      const parentWidth = containerRef.current.parentElement?.clientWidth || 0;
      // 確保最小寬度為 600px
      const actualWidth = Math.max(600, parentWidth - 40);
      // 保持寬高比例
      const aspectRatio = defaultDimensions.height / defaultDimensions.width;
      const actualHeight = actualWidth * aspectRatio;

      // 如果父容器足夠大，使用實際計算的尺寸；否則使用固定尺寸並允許滾動
      if (parentWidth >= 640) { // 600 + 40
        setDimensions({ width: actualWidth, height: actualHeight });
      } else {
        // 在小容器中使用固定尺寸
        setDimensions({ width: 600, height: 400 });
      }
    }, []);

    // 初始化時和容器大小變化時重新計算尺寸
    useEffect(() => {
      updateSize();
      
      // 創建 ResizeObserver 來監聽父容器大小變化
      const resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      
      if (containerRef.current?.parentElement) {
        resizeObserver.observe(containerRef.current.parentElement);
      }
      
      // 監聽窗口大小變化
      window.addEventListener('resize', updateSize);
      
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateSize);
      };
    }, [updateSize]);

    // 當尺寸變化或數據變化時重新渲染圖表
    useEffect(() => {
      if (!svgRef.current || !data) return;

      // 清除先前的內容
      while (svgRef.current.firstChild) {
        svgRef.current.removeChild(svgRef.current.firstChild);
      }

      // 更新 SVG 尺寸
      svgRef.current.setAttribute('width', dimensions.width.toString());
      svgRef.current.setAttribute('height', dimensions.height.toString());

      if (mode === 'mindmap') {
        const mindmap = new MindMap(
          svgRef.current,
          dimensions.width,
          dimensions.height,
          15,     // 一般垂直間距
          80      // 第三層以後的垂直間距
        );
        mindmap.render(data);
        
        // 在渲染後增加節點大小和文字大小
        setTimeout(() => {
          if (!svgRef.current) return;
          
          // 增加文字大小
          const textElements = svgRef.current.querySelectorAll('text');
          textElements.forEach(text => {
            // 增加字體大小和字重
            text.setAttribute('font-size', '14');
            text.setAttribute('font-weight', '500');
          });
          
          // 增加節點大小
          const circleElements = svgRef.current.querySelectorAll('circle');
          circleElements.forEach(circle => {
            const currentRadius = parseFloat(circle.getAttribute('r') || '0');
            circle.setAttribute('r', `${currentRadius * 1.2}`);
          });
          
          // 調整連接線寬度
          const pathElements = svgRef.current.querySelectorAll('path');
          pathElements.forEach(path => {
            path.setAttribute('stroke-width', '2');
          });
        }, 100);
      } else {
        const scd = new SystemContextDiagram();
        
        // 建立 D3 選擇器並設定基本屬性
        const svg = d3.select(svgRef.current);
        svg.attr('width', dimensions.width)
           .attr('height', dimensions.height)
           .style('background', '#fff');
        
        // 解析並渲染資料
        try {
          // 將原始數據轉換為字符串，確保 parseInput 可以正確處理
          let jsonStr;
          if (typeof data === 'string') {
            jsonStr = data;
          } else {
            jsonStr = JSON.stringify(data);
          }
          
          console.log("渲染 SCD 圖，原始數據:", jsonStr);
          
          // 使用 parseInput 方法處理數據，這將計算所有必要的坐標和屬性
          const processedData = scd.parseInput(jsonStr);
          console.log("處理後的 SCD 數據:", processedData);
          
          if (processedData.nodes && processedData.nodes.length > 0) {
            // 繪製 SCD 圖
            const { nodes, links } = processedData;
            
            // 創建縮放元素
            const zoomContainer = svg.append('g');
            const mainContainer = zoomContainer.append('g').attr('class', 'main-container');
            const linkGroup = mainContainer.append('g').attr('class', 'links');
            const nodeGroup = mainContainer.append('g').attr('class', 'nodes');
            
            const zoom = d3.zoom()
              .scaleExtent([0.2, 1.5])
              .on('zoom', (event) => {
                zoomContainer.attr('transform', event.transform);
              });
            svg.call(zoom);
            
            // 建立箭頭標記定義
            const defs = svg.append('defs');
            ['up', 'down'].forEach(direction => {
              defs.append('marker')
                .attr('id', `arrow-${direction}`)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 8)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', direction === 'up' ? 'auto-start-reverse' : 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', '#555');
            });
            
            // 繪製連線
            const linkPaths = linkGroup.selectAll('path')
              .data(links)
              .enter()
              .append('path')
              .attr('fill', 'none')
              .attr('stroke', d => d === selectedLink ? '#ff6b6b' : '#555')
              .attr('stroke-width', d => d === selectedLink ? 2.5 : 1.5)
              .attr('d', d => scd.calculatePathPoints(d, nodes))
              .attr('marker-end', d => {
                const sourceNode = nodes.find(n => n.id === d.source);
                const targetNode = nodes.find(n => n.id === d.target);
                return sourceNode && targetNode && sourceNode.x < targetNode.x ?
                  'url(#arrow-up)' : 'url(#arrow-down)';
              })
              .on('click', (event, d) => {
                event.stopPropagation();
                setSelectedNode(null);
                setSelectedLink(d);
              });
            
            // 繪製連線標籤
            const linkLabels = linkGroup.selectAll('g')
              .data(links)
              .enter()
              .append('g')
              .attr('class', 'link-label');
            
            linkLabels.append('rect')
              .attr('fill', 'white')
              .attr('opacity', 0.8)
              .attr('rx', 3);
            
            linkLabels.append('text')
              .text(d => d.label)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('font-size', '12px')
              .attr('fill', d => d === selectedLink ? '#ff6b6b' : '#555');
            
            // 更新連線標籤位置
            linkLabels.each(function(d) {
              if (!d.pathPoints) return;
              
              const labelGroup = d3.select(this);
              const text = labelGroup.select('text');
              const rect = labelGroup.select('rect');
              
              const x = (d.pathPoints.sourceX + d.pathPoints.targetX) / 2;
              const y = d.pathPoints.midY1 - 15;
              
              text.attr('x', x).attr('y', y);
              
              const bbox = text.node()!.getBBox();
              rect.attr('x', bbox.x - 4)
                  .attr('y', bbox.y - 2)
                  .attr('width', bbox.width + 8)
                  .attr('height', bbox.height + 4);
              
              labelGroup.style('cursor', 'pointer')
                       .on('click', (event) => {
                         event.stopPropagation();
                         setSelectedLink(d);
                         setSelectedNode(null);
                       });
            });
            
            // 拖拽功能實現
            function nodeDragStarted(event: any) {
              d3.select(event.sourceEvent.target.parentNode).raise();
            }
            
            function nodeDragged(event: any, d: any) {
              const newX = event.x;
              const newY = event.y;
              
              // 更新節點位置
              d.x = newX;
              d.y = newY;
              
              // 清除舊的輔助線
              svg.selectAll('.guideline').remove();
              svg.selectAll('.guideline-text').remove();
              
              // 顯示對齊輔助線
              showAlignmentGuides(d, newX, newY);
              
              // 更新圖形
              d3.select(event.sourceEvent.target.parentNode)
                .attr('transform', `translate(${newX},${newY})`);
              
              // 更新連接到此節點的連線
              linkPaths.filter(l => l.source === d.id || l.target === d.id)
                     .attr('d', l => scd.calculatePathPoints(l, nodes));
              
              // 更新連線標籤
              linkLabels.each(function(l) {
                if (l.source === d.id || l.target === d.id) {
                  if (!l.pathPoints) return;
                  
                  const labelGroup = d3.select(this);
                  const text = labelGroup.select('text');
                  const rect = labelGroup.select('rect');
                  
                  const x = (l.pathPoints.sourceX + l.pathPoints.targetX) / 2;
                  const y = l.pathPoints.midY1 - 15;
                  
                  text.attr('x', x).attr('y', y);
                  
                  const bbox = text.node()!.getBBox();
                  rect.attr('x', bbox.x - 4)
                      .attr('y', bbox.y - 2)
                      .attr('width', bbox.width + 8)
                      .attr('height', bbox.height + 4);
                }
              });
            }
            
            function showAlignmentGuides(node: any, x: number, y: number) {
              let closestX = null;
              let closestY = null;
              let minDeltaX = Infinity;
              let minDeltaY = Infinity;
              
              nodes.forEach(other => {
                if (other.id === node.id) return;
                const dx = Math.abs(x - other.x);
                const dy = Math.abs(y - other.y);
                
                if (dx < minDeltaX) {
                  minDeltaX = dx;
                  closestX = other;
                }
                if (dy < minDeltaY) {
                  minDeltaY = dy;
                  closestY = other;
                }
              });
              
              if (closestX && minDeltaX < 20) {
                svg.append('line')
                  .attr('class', 'guideline')
                  .attr('x1', closestX.x)
                  .attr('y1', 0)
                  .attr('x2', closestX.x)
                  .attr('y2', dimensions.height)
                  .attr('stroke', '#aaa')
                  .attr('stroke-width', 1)
                  .attr('stroke-dasharray', '5,5');
              }
              
              if (closestY && minDeltaY < 20) {
                svg.append('line')
                  .attr('class', 'guideline')
                  .attr('x1', 0)
                  .attr('y1', closestY.y)
                  .attr('x2', dimensions.width)
                  .attr('y2', closestY.y)
                  .attr('stroke', '#aaa')
                  .attr('stroke-width', 1)
                  .attr('stroke-dasharray', '5,5');
              }
            }
            
            function nodeDragEnded() {
              // 清除輔助線
              svg.selectAll('.guideline').remove();
              svg.selectAll('.guideline-text').remove();
            }
            
            // 繪製節點
            const nodeElements = nodeGroup.selectAll('g')
              .data(nodes)
              .enter()
              .append('g')
              .attr('transform', d => `translate(${d.x},${d.y})`)
              .call(d3.drag<SVGGElement, any>()
                .on('start', nodeDragStarted)
                .on('drag', nodeDragged)
                .on('end', nodeDragEnded)
              )
              .on('click', (event, d) => {
                event.stopPropagation();
                setSelectedNode(d);
                setSelectedLink(null);
              });
            
            nodeElements.append('rect')
              .attr('width', d => d.width || 180)
              .attr('height', d => d.height || 80)
              .attr('x', d => (d.width || 180) / -2)
              .attr('y', d => (d.height || 80) / -2)
              .attr('rx', 5)
              .attr('ry', 5)
              .attr('fill', d => {
                if (d === selectedNode) return '#ffd54f';
                return d.type === 'external' ? '#e0f7fa' : '#b3e5fc';
              })
              .attr('stroke', '#333')
              .attr('stroke-width', d => d === selectedNode ? 3 : 2);
            
            nodeElements.append('text')
              .attr('text-anchor', 'middle')
              .attr('dy', 4)
              .attr('font-size', '18px')
              .text(d => d.label || d.id);
            
            // 點擊背景取消選擇
            svg.on('click', () => {
              setSelectedNode(null);
              setSelectedLink(null);
            });
            
            // 新增節點功能
            if (isAddingNode) {
              svg.on('click', (event) => {
                const [x, y] = d3.pointer(event);
                const transform = d3.zoomTransform(svg.node()!);
                const actualX = (x - transform.x) / transform.k;
                const actualY = (y - transform.y) / transform.k;
                
                const newNode = {
                  id: `node_${Date.now()}`,
                  label: '新節點',
                  x: actualX,
                  y: actualY,
                  width: 180,
                  height: 80,
                  type: 'process'
                };
                
                nodes.push(newNode);
                setIsAddingNode(false);
                
                // 重新渲染
                nodeGroup.selectAll('*').remove();
                nodeElements.data(nodes).enter();
                
                // 注意：這裡只是模擬添加節點，實際上需要更新 data 狀態來觸發重新渲染
              });
            }
            
            // 自動縮放適應所有節點
            const padding = 50;
            const bounds = {
              minX: d3.min(nodes, d => d.x - (d.width || 180) / 2) || 0,
              maxX: d3.max(nodes, d => d.x + (d.width || 180) / 2) || dimensions.width,
              minY: d3.min(nodes, d => d.y - (d.height || 80) / 2) || 0,
              maxY: d3.max(nodes, d => d.y + (d.height || 80) / 2) || dimensions.height
            };
            
            const xScale = (dimensions.width - padding * 2) / (bounds.maxX - bounds.minX);
            const yScale = (dimensions.height - padding * 2) / (bounds.maxY - bounds.minY);
            const scale = Math.min(xScale, yScale, 1);
            
            const translateX = (dimensions.width - (bounds.maxX - bounds.minX) * scale) / 2 - bounds.minX * scale;
            const translateY = (dimensions.height - (bounds.maxY - bounds.minY) * scale) / 2 - bounds.minY * scale;
            
            svg.call(zoom.transform, d3.zoomIdentity
              .translate(translateX, translateY)
              .scale(scale));
          } else {
            throw new Error('SCD 數據缺少有效的節點');
          }
        } catch (error) {
          console.error('渲染 SCD 圖錯誤:', error);
          svg.append('text')
            .attr('x', dimensions.width / 2)
            .attr('y', dimensions.height / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', 'red')
            .text('無法渲染系統上下文圖：' + error.message);
        }
      }
    }, [data, mode, dimensions, selectedNode, selectedLink, isAddingNode]);

    return (
      <div 
        ref={containerRef} 
        className="bg-white rounded-lg p-4 my-4"
        style={{ 
          width: '100%',
          overflowX: 'auto' // 允許水平滾动
        }}
      >
        <div style={{ 
          minWidth: dimensions.width < 600 ? '600px' : 'auto',
          width: dimensions.width < 600 ? '600px' : 'auto'
        }}>
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="rounded-lg"
            style={{
              display: 'block',
              background: 'white'
            }}
          />
        </div>
      </div>
    );
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
    <div 
      key={`message-${idx}`}
      className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"} mb-4`}
    >
      <div className={`max-w-[95%] md:max-w-[80%] ${
        msg.role === "assistant" 
          ? "bg-gray-100 rounded-r-lg rounded-bl-lg ml-2" 
          : "bg-blue-100 rounded-l-lg rounded-br-lg mr-2"
      } p-4 relative`}>
        
        {/* 圖片區塊 - 這裡需要改正 */}
        {msg.images && msg.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {msg.images.map((image, i) => (
              <div key={`img-${image.fileId}-${i}`} className="relative group">
                <img 
                  src={image.base64 ? `data:image/jpeg;base64,${image.base64}` : getImageUrl(image.fileId)}
                  alt={image.filename || `圖片 ${i+1}`}
                  className="max-w-[150px] max-h-[150px] rounded-lg object-cover cursor-pointer hover:opacity-90"
                  onClick={() => window.open(getImageUrl(image.fileId), '_blank')}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* 文字內容區塊 - 使用 ReactMarkdown */}
        <div className="text-base md:text-lg font-Inknut_Antiqua-Regular break-words prose prose-slate max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ node, inline, className, children, ...props }: any) => {
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
              p: ({ children }: { children?: React.ReactNode }) => (
                <p className="whitespace-pre-wrap mb-2">{children}</p>
              ),
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
        
        {/* 圖表區塊 - 修改為正確判斷圖表類型 */}
        {msg.graph_json && (
          <div className="mt-4 w-full">
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <GraphRenderer 
                data={msg.graph_json} 
                mode={(msg.graph_json.nodes && Array.isArray(msg.graph_json.nodes)) ? 'graph' : 'mindmap'} 
              />
            </div>
          </div>
        )}
        
        {/* 新的動畫元素 - 與 Markdown 分離 */}
        {msg.role === "assistant" && isLoading && idx === messages.length - 1 && (
          <div className="typing-indicator mt-2">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </div>
        )}
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

  // 新增刪除對話函數
  const handleDeleteChat = async (chatId: string) => {
    try {
      setIsLoading(true);
      const result = await deleteChatHistory(chatId);
      
      if (result.success) {
        // 從聊天歷史列表中移除被刪除的聊天
        setChatHistories(prev => prev.filter(chat => chat.chat_id !== chatId));
        
        // 如果刪除的是當前選中的聊天，則重置當前聊天
        if (currentChatId === chatId) {
          setCurrentChatId(null);
          setMessages([]);
          localStorage.removeItem('current_chat_id');
        }
        
        // 顯示成功訊息
        setError(null);
      } else {
        throw new Error(result.message || '刪除對話失敗');
      }
    } catch (err) {
      console.error('刪除對話失敗:', err);
      setError(err instanceof Error ? err.message : '刪除對話失敗');
    } finally {
      setDeleteConfirmId(null);
      setIsLoading(false);
    }
  };

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

          /* 這些樣式已經包含在上面的 JSX 中，使用了 Tailwind 的 utility classes */
          .group:hover .group-hover\:opacity-100 {
            opacity: 1;
          }
          .opacity-0 {
            opacity: 0;
          }
          .transition-opacity {
            transition-property: opacity;
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            transition-duration: 150ms;
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
              src="/pic/2021781015212021.png"
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
            src="/pic/bars-solid.svg"
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
                  className={`
                    p-3 mb-2 rounded-xl 
                    transition-colors duration-200
                    ${currentChatId === chat.chat_id 
                      ? 'bg-[#D1E8FF] border border-[#B5D1E1]' 
                      : 'hover:bg-gray-100'
                    }
                    relative group
                  `}
                >
                  <div 
                    onClick={() => selectChat(chat.chat_id)}
                    className="cursor-pointer"
                  >
                    <div className="font-semibold truncate pr-7">{chat.title}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(chat.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {/* 刪除按鈕 - 滑鼠懸停時顯示 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(chat.chat_id);
                    }}
                    className="absolute right-2 top-3 text-gray-400 hover:text-red-500 
                      opacity-0 group-hover:opacity-100 transition-opacity"
                    title="刪除對話"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  
                  {/* 刪除確認對話框 */}
                  {deleteConfirmId === chat.chat_id && (
                    <div className="absolute inset-0 bg-white rounded-xl shadow-md p-2 z-20 border border-gray-200">
                      <p className="text-sm font-bold text-center">確定要刪除此對話嗎？</p>
                      <div className="flex justify-center gap-2 mt-2">
                        <button
                          onClick={() => handleDeleteChat(chat.chat_id)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                          disabled={isLoading}
                        >
                          {isLoading ? '刪除中...' : '確定'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
                          disabled={isLoading}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
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
                src="/pic/53783794637-44b575bb56-b-removebg-preview.png"
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
                      src="/pic/pixeltrue-data-analysis-1-1@2x.png"
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
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (e.shiftKey) {
                              // Shift + Enter 換行 - textarea 會自動處理
                              return;
                            } else if (question.trim() && !isLoading) {
                              // 只有 Enter 發送
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }
                        }}
                        className="ml-2 w-full bg-transparent focus:outline-none text-lg resize-none"
                        placeholder={isLoading ? "Model is responding..." : "Type your message (Shift + Enter for new line)..."}
                        rows={1}
                        style={{ 
                          height: 'auto',
                          minHeight: '24px',
                          maxHeight: '120px'
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
                        src="/pic/polygon-3-2.svg"
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
