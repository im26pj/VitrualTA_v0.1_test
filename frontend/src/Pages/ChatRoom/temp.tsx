import React, { JSX, useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthToken, getAuthToken } from "../../utils/auth";
import { 
  fetchWithFallback, 
  fetchSSEStream, 
  apiGet, 
  apiPost, 
  apiDelete, 
  apiPostFormData,
  uploadImage, 
  getImageUrl, 
  deleteImage, 
  getModelList, 
  getLoraList 
} from '../../../api_servers';
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

// 1. 添加需要的介面定義
interface NodeData {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  type?: string;
  label: string;  // 移除 ? 使其成為必填欄位
}

interface LinkData {
  source: string;
  target: string;
  label?: string;
  pathPoints?: any;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// 添加模型和LoRA相關介面
interface Model {
  fileId: string;
  filename: string;
  originalFilename: string;
  modelType: string;
  description: string;
  uploadDate: string;
  size: number;
  prettySize: string;
  modelImages?: string[]; // 添加圖片ID數組
  modelMainImage?: string; // 添加主圖ID
}

interface Lora {
  fileId: string;
  filename: string;
  originalFilename: string;
  description: string;
  uploadDate: string;
  size: number;
  prettySize: string;
  loraImages?: string[]; // 添加圖片ID數組
  loraMainImage?: string; // 添加主圖ID
}

// 首先在現有的 interface 之後添加新的介面定義
interface UploadingFile {
  file: File;
  preview?: string;
  name: string;
  type: string;
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
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [selectedLink, setSelectedLink] = useState<LinkData | null>(null);
  const [isAddingNode, setIsAddingNode] = useState(false);

  // 新增刪除對話確認狀態
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 在 ChatRoom 組件的開頭添加以下狀態變數
  const [showToolMenu, setShowToolMenu] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"sd15" | "sd21" | "sdxl" | "sd3-m" | "sd35-m" | "sd35-l">("sd15"); // 預設為 1.5
  const toolButtonRef = useRef<HTMLButtonElement>(null);

  // 新增模型選單狀態
  const [showModelOptions, setShowModelOptions] = useState(false);

  // 在 ChatRoom 組件內添加新的狀態變數
  const [showImageCountOptions, setShowImageCountOptions] = useState(false);
  const [selectedImageCount, setSelectedImageCount] = useState<number>(1); // 預設為 1

  // 在現有的狀態變數區域添加新的狀態
  const [showUploadUI, setShowUploadUI] = useState(false);
  const [selectedSD, setSelectedSD] = useState<string>(""); // 用於追蹤選擇的SD模型

  // 添加缺少的狀態變數
  const [showPictureSettings, setShowPictureSettings] = useState(false);
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const modelNames = ["MODEL", "LORA"];

  // 在現有的狀態變數區域添加新的狀態
  const [modelType, setModelType] = useState<"CUSTOM MODEL" | "LORA">("CUSTOM MODEL"); // 用於追蹤 CUSTOM MODEL 或 LORA
  const [sdVersion, setSdVersion] = useState<string>("SD 1.5"); // 用於追蹤選擇的 SD 版本
  const [modelDescription, setModelDescription] = useState<string>(""); // 用於追蹤模型描述
  const [modelUrl, setModelUrl] = useState<string>(""); // 用於追蹤輸入的模型網址

  // 修改模型和LoRA相關狀態
  const [models, setModels] = useState<Model[]>([]);
  const [loras, setLoras] = useState<Lora[]>([]);
  const [selectedModelInfo, setSelectedModelInfo] = useState<Model | null>(null);
  const [selectedLora, setSelectedLora] = useState<Lora | null>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  
  // 添加新狀態用於追蹤當前顯示的模型圖片
  const [currentModelImageIndex, setCurrentModelImageIndex] = useState(0);
  const [currentModelImages, setCurrentModelImages] = useState<string[]>([]);

  // 添加新的狀態變數
  const [uploadingFile, setUploadingFile] = useState<UploadingFile | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isModelUploading, setIsModelUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const modelFileInputRef = useRef<HTMLInputElement>(null);
  const modelImageInputRef = useRef<HTMLInputElement>(null);

  //添加紀錄是否使用lora 、 model 變數
  const [isUsingModelLora, setIsUsingModelLora] = useState<boolean>(false);

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

  // 在 selectChat 函数中增加 img_id 處理邏輯
  const selectChat = async (chatId: string) => {
    try {
      setIsLoading(true);
      const response = await apiGet(`/api/chat/${chatId}`);
      
      if (response.success) {
        // 處理並轉換歷史記錄中的圖片ID
        const processedHistory = response.chat_history.map((msg: any) => {
          // 核心修改：確保將img_id轉換為前端需要的images格式
          const processedMsg = { ...msg };
          
          if (msg.img_id && msg.img_id.length > 0) {
            processedMsg.images = msg.img_id.map((id: string) => ({
              fileId: id,
              filename: `AI生成圖片`
            }));
          }
          
          return processedMsg;
        });
        
        setMessages(processedHistory);
        setCurrentChatId(chatId);
        setIsSidebarOpen(false);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '載入對話失敗');
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

  // 修改 handleSendMessage 函數，傳遞 model 參數
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
      const messageData: {
        conversationHistory: Message[];
        chat_id: string | null;
        isVisitor: boolean;
        isNewChat: boolean;
        img_id: string[];
        model: "sd15" | "sd21" | "sdxl" | "sd3-m" | "sd35-m" | "sd35-l";
        genpic_num: number;
        webui_style_model_name?: string; // 新增可選屬性
        lora_name?: string;             // 新增可選屬性
      } = {
        conversationHistory: [...messages, userMessage],
        chat_id: currentChatId,
        isVisitor: false,
        isNewChat: messages.length === 0,
        img_id: currentImageIds,
        model: selectedModel,
        genpic_num: selectedImageCount,
      };


      if(isUsingModelLora){
        if(currentModelIndex === 0){messageData.webui_style_model_name = selectedModelInfo?.fileId;}
        else if(currentModelIndex === 1){messageData.lora_name = selectedLora?.fileId;}
      }//等等回來3

      await fetchSSEStream(
        "/api/chat",
        messageData,
        (content: any) => {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            
            // 處理生成的圖片回應
            if (typeof content === 'object' && content.type === 'image') {
              const lastAssistantMsgIndex = [...prev].reverse().findIndex(m => m.role === 'assistant');
              
              // 如果最後一條 assistant 訊息有內容，不替換它，而是添加新訊息
              if (lastAssistantMsgIndex >= 0 && prev[prev.length - 1 - lastAssistantMsgIndex].content.trim()) {
                return [...prev, {
                  role: "assistant",
                  content: '已為您生成圖片',
                  img_id: [content.imageId],
                  images: [content.image || {
                    fileId: content.imageId,
                    filename: `AI生成圖片 ${new Date().toLocaleTimeString()}`
                  }]
                }];
              } else {
                // 沒有實質內容的訊息才替換
                return [...prev.slice(0, -1), {
                  ...lastMessage,
                  content: '已為您生成圖片',
                  img_id: [content.imageId],
                  images: [content.image]
                }];
              }
            }
            
            // 檢查是否為圖表數據
            if (typeof content === 'object' && content.type === 'graph') {
              return [...prev.slice(0, -1), {
                ...lastMessage,
                graph_json: content.content,  // 直接使用圖表數據
                content: lastMessage.content || ''
              }];
            }
            
            // 一般文字內容
            if (lastMessage?.role === "assistant") {
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

  const ApplyModelLora = async () => {
    if(currentModelIndex === 0 ){
      console.log("custom model id :", selectedLora); 
      console.log("custom model info: ", selectedModelInfo);
      setSelectedModel(selectedModelInfo?.modelType as "sd15" | "sd21" | "sdxl" | "sd3-m" | "sd35-m" | "sd35-l");
    }
    else if(currentModelIndex === 1 ){
      console.log("lora id: ", selectedModelInfo?.modelType);
      setSelectedModel(selectedLora?.modelType as "sd15" | "sd21" | "sdxl" | "sd3-m" | "sd35-m" | "sd35-l");

    }//等等回來2
   
    setIsUsingModelLora(true);
  }


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
            // 明確指定節點和連結的類型
            const nodes = processedData.nodes as NodeData[];
            const links = processedData.links as LinkData[];
            
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
            
            // 使用類型斷言解決 zoom 類型問題
            svg.call(zoom as any);
            
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
              .attr('d', d => scd.calculatePathPoints(d as any, nodes))
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
              .text(d => d.label || "")
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
              
              // 使用類型斷言處理 getBBox
              const textNode = text.node();
              if (textNode) {
                const bbox = (textNode as SVGTextElement).getBBox();
                rect.attr('x', bbox.x - 4)
                    .attr('y', bbox.y - 2)
                    .attr('width', bbox.width + 8)
                    .attr('height', bbox.height + 4);
              }
              
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
                     .attr('d', l => scd.calculatePathPoints(l as any, nodes));
              
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
              let closestX: NodeData | null = null;
              let closestY: NodeData | null = null;
              let minDeltaX = Infinity;
              let minDeltaY = Infinity;
              
              nodes.forEach((other: NodeData) => {
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
                // 使用類型斷言訪問 type 屬性
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
            const bounds: Bounds = {
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
            
            // 修復 transform 相關錯誤
            svg.call(zoom.transform as any, d3.zoomIdentity
              .translate(translateX, translateY)
              .scale(scale));
          }
        } catch (error: any) {
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

  // 修改 useEffect 滾动邏輯
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
        
        {/* 圖片顯示區塊 - 處理各種可能的格式 */}
        {(msg.images && msg.images.length > 0 || (msg.img_id && msg.img_id.length > 0)) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {/* 先顯示 images 陣列中的圖片 */}
            {msg.images?.map((image, i) => (
              <div key={`img-${image.fileId}-${i}`} className="relative group">
                <img 
                  src={image.base64 ? `data:image/jpeg;base64,${image.base64}` : getImageUrl(image.fileId)}
                  alt={image.filename || `圖片 ${i+1}`}
                  className="max-w-[150px] max-h-[150px] rounded-lg object-cover cursor-pointer hover:opacity-90"
                  onClick={() => window.open(getImageUrl(image.fileId), '_blank')}
                />
              </div>
            ))}
            {/* 如果沒有 images，但有 img_id，也顯示圖片 */}
            {!msg.images && msg.img_id?.map((imgId, i) => (
              <div key={`img-id-${imgId}-${i}`} className="relative group">
                <img 
                  src={getImageUrl(imgId)}
                  alt={`圖片 ${i+1}`}
                  className="max-w-[150px] max-h-[150px] rounded-lg object-cover cursor-pointer hover:opacity-90"
                  onClick={() => window.open(getImageUrl(imgId), '_blank')}
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

  // 修改點擊外部區域關閉選單的邏輯
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const modelMenuElement = document.querySelector('.model-options-menu');
      const modelButtonElement = document.querySelector('[data-model-button]');
      const countMenuElement = document.querySelector('.image-count-menu');
      const countButtonElement = document.querySelector('[data-count-button]');
      
      if (!modelMenuElement?.contains(event.target as Node) &&
          !modelButtonElement?.contains(event.target as Node) &&
          showModelOptions) {
        setShowModelOptions(false);
      }
      
      if (!countMenuElement?.contains(event.target as Node) &&
          !countButtonElement?.contains(event.target as Node) &&
          showImageCountOptions) {
        setShowImageCountOptions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelOptions, showImageCountOptions]); // 保持依賴項一致

  // 修改獲取模型和LoRA的函數
  const fetchModelsAndLoras = async () => {
    setIsLoadingModels(true);
    setModelLoadError(null);
    
    try {
      // 獲取模型列表
      const modelResponse = await getModelList();
      if (modelResponse.success && modelResponse.models.length > 0) {
        setModels(modelResponse.models);
        // 預設選擇第一個模型
        setSelectedModelInfo(modelResponse.models[0]);
        
        // 設置初始模型圖片
        if (modelResponse.models[0].modelImages && modelResponse.models[0].modelImages.length > 0) {
          setCurrentModelImages(modelResponse.models[0].modelImages);
          setCurrentModelImageIndex(0);
        } else {
          setCurrentModelImages([]);
        }
      } else {
        setModels([]);
        setSelectedModelInfo(null);
        setCurrentModelImages([]);
      }
      
      // 獲取 LoRA 列表
      const loraResponse = await getLoraList();
      if (loraResponse.success && loraResponse.loras.length > 0) {
        setLoras(loraResponse.loras);
        // 預設選擇第一個 LoRA
        setSelectedLora(loraResponse.loras[0]);
      } else {
        setLoras([]);
        setSelectedLora(null);
      }
    } catch (error) {
      console.error('載入模型和LoRA列表失敗:', error);
      setModelLoadError('載入失敗，請重試');
    } finally {
      setIsLoadingModels(false);
    }
  };

  // 當打開 Picture Setting 時獲取模型和 LoRA 列表
  useEffect(() => {
    if (showPictureSettings) {
      fetchModelsAndLoras();
    }
  }, [showPictureSettings]);

  // 處理模型選擇
  const handleModelSelect = (model: Model) => {
    setSelectedModelInfo(model);
    setShowModelDropdown(false);
    
    // 更新當前顯示的圖片
    if (model.modelImages && model.modelImages.length > 0) {
      setCurrentModelImages(model.modelImages);
      setCurrentModelImageIndex(0);
    } else {
      setCurrentModelImages([]);
    }
  };

  // 處理 LoRA 選擇
  const handleLoraSelect = (lora: Lora) => {
    setSelectedLora(lora);
    setShowModelDropdown(false);
    
    // 更新當前顯示的圖片
    if (lora.loraImages && lora.loraImages.length > 0) {
      setCurrentModelImages(lora.loraImages);
      setCurrentModelImageIndex(0);
    } else {
      setCurrentModelImages([]);
    }
  };
  
  // 添加圖片導航函數
  const navigateImage = (direction: 'prev' | 'next') => {
    if (currentModelImages.length === 0) return;
    
    if (direction === 'prev') {
      setCurrentModelImageIndex(prev => 
        prev === 0 ? currentModelImages.length - 1 : prev - 1
      );
    } else {
      setCurrentModelImageIndex(prev => 
        prev === currentModelImages.length - 1 ? 0 : prev + 1
      );
    }
  };

  // 修改 handleModelFileUpload 函數
  const handleModelFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0]; // 只取第一個檔案
    
    // 檢查檔案類型
    const isImage = file.type.startsWith('image/');
    const isModelFile = file.name.endsWith('.safetensors') || 
                        file.name.endsWith('.ckpt') || 
                        file.name.endsWith('.pt') || 
                        file.name.endsWith('.bin') ||
                        file.name.endsWith('.zip');
    
    if (isImage) {
      // 如果是圖片，設置為預覽圖
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
      
      // 當檔案是圖片時，自動觸發圖片上傳區的變更
      handleModelImageUpload(files);
      return;
    }
    
    if (isModelFile) {
      // 如果是模型檔案
      setUploadingFile({
        file,
        name: file.name,
        type: file.type
      });
      setUploadMessage(null);
    } else {
      setUploadMessage({
        type: 'error',
        message: '不支援的檔案類型。請上傳 .safetensors, .ckpt, .pt, .bin 或 .zip 檔案。'
      });
    }
  };

  // 添加模型圖片上傳處理函數
  const handleModelImageUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setUploadMessage({
        type: 'error',
        message: '只能上傳圖片檔案'
      });
      return;
    }
    
    // 生成預覽
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
    
    // 設置到 ref，以便之後上傳
    if (modelType === "CUSTOM MODEL") {
      if (modelImageInputRef.current) {
        // 創建一個新的 FileList 物件是不可能的，所以我們需要一個替代方案
        // 這裡直接替換整個 input 元素的方式處理
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        modelImageInputRef.current.files = dataTransfer.files;
      }
    } else {
      if (modelImageInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        modelImageInputRef.current.files = dataTransfer.files;
      }
    }
  };

  // 修改上傳模型或LoRA的函數
  const uploadModelOrLora = async () => {
    // 檢查必要的選項是否已選擇
    if (modelType !== "CUSTOM MODEL" && modelType !== "LORA") {
      setUploadMessage({
        type: 'error',
        message: '請選擇檔案類型 (CUSTOM MODEL 或 LORA)'
      });
      return;
    }
    
    // 檢查是否有檔案或網址
    if (!uploadingFile && !modelUrl) {
      setUploadMessage({
        type: 'error',
        message: '請上傳檔案或輸入模型網址'
      });
      return;
    }
    
    // 如果是上傳檔案，必須選擇SD版本
    if (uploadingFile && !modelUrl && sdVersion === "") {
      setUploadMessage({
        type: 'error',
        message: '請選擇模型類型 (SD版本)'
      });
      return;
    }
    
    setIsModelUploading(true); // 設置上傳中狀態
    setUploadMessage(null);
    
    try {
      // 準備要傳送的資料
      let requestData = {};
      
      // 添加公共參數
      requestData = {
        description: modelDescription
      };
      
      if (modelUrl) {
        // URL 上傳方式
        requestData = {
          ...requestData,
          filePath: modelUrl
        };
      }
      
      // 檔案上傳需要使用 FormData
      if (uploadingFile) {
        const formData = new FormData();
        
        // 添加描述
        formData.append('description', modelDescription);
        
        // 如果有 URL
        if (modelUrl) {
          formData.append('filePath', modelUrl);
        }
        
        // 根據類型添加檔案
        if (modelType === "CUSTOM MODEL") {
          formData.append('modelFile', uploadingFile.file);
          formData.append('modelType', sdVersion.replace(" - M", "").replace(" - L", "").replace(" ", "").toLowerCase());
        } else {
          formData.append('loraFile', uploadingFile.file);
        }
        
        // 如果有圖片預覽，表示已上傳圖片
        if (filePreview) {
          // 從 DOM 中獲取上傳的圖片檔案
          const imageInput = modelType === "CUSTOM MODEL" 
            ? modelImageInputRef.current?.files?.[0]
            : modelImageInputRef.current?.files?.[0];
          
          if (imageInput) {
            if (modelType === "CUSTOM MODEL") {
              formData.append('modelImage', imageInput);
            } else {
              formData.append('loraImage', imageInput);
            }
          }
        }
        
        // 使用適合 FormData 的方法
        const result = await apiPostFormData(
          modelType === "CUSTOM MODEL" ? '/api/upload/model' : '/api/upload/lora',
          formData
        );
        
        if (result.success) {
          setUploadMessage({
            type: 'success',
            message: `${modelType === "CUSTOM MODEL" ? '模型' : 'LoRA'} 上傳成功！`
          });
          
          // 重新獲取模型和LoRA列表
          fetchModelsAndLoras();
          
          // 清除上傳的檔案和預覽
          setUploadingFile(null);
          if (filePreview) {
            URL.revokeObjectURL(filePreview);
            setFilePreview(null);
          }
          
          // 清除選擇的SD版本和描述
          setSdVersion("");
          setModelDescription("");
          setModelUrl("");
        } else {
          throw new Error(result.message || '上傳失敗');
        }
      } else {
        // 僅 URL 上傳 (無檔案)
        // 根據選擇的檔案類型呼叫對應的 API
        const result = await apiPost(
          modelType === "CUSTOM MODEL" ? '/api/upload/model' : '/api/upload/lora', 
          requestData
        );
        
        if (result.success) {
          setUploadMessage({
            type: 'success',
            message: `${modelType === "CUSTOM MODEL" ? '模型' : 'LoRA'} 上傳成功！`
          });
          
          // 重新獲取模型和LoRA列表
          fetchModelsAndLoras();
          
          // 清除輸入內容
          setModelUrl("");
          setModelDescription("");
          setSdVersion("");
        } else {
          throw new Error(result.message || '上傳失敗');
        }
      }
    } catch (error) {
      console.error('上傳失敗:', error);
      setUploadMessage({
        type: 'error',
        message: error instanceof Error ? error.message : '上傳失敗，請重試'
      });
    } finally {
      setIsModelUploading(false);
    }
  };

  // 在 useEffect 中添加清理預覽圖片的邏輯
  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  // 添加檔案拖放處理函數
  const handleModelFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleModelFileUpload(files);
    }
  };

  const handleModelImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleModelImageUpload(files);
    }
  };

  return (
    <div className="bg-[#6683d2] flex flex-col items-center w-full min-h-screen px-4 md:px-8">
      {/* 新增打字動畫樣式 */}
      <style>
        {`
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

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.2s ease-out forwards;
        }
        
        /* 自定義滾動條樣式 */
        .image-count-menu::-webkit-scrollbar {
          width: 6px;
        }
        
        .image-count-menu::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .image-count-menu::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 3px;
        }
        
        .image-count-menu::-webkit-scrollbar-thumb:hover {
          background: #aaa;
        }
        `}
      </style>

      <div className="w-full relative z-10"></div>
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
                    onClick={() => setShowPictureSettings(true)}  // 改為開啟圖片設定視窗
                  >
                    Picture Setting
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
                    {/* 上傳檔案按鈕 */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        fileInputRef.current?.click(); // 使用 ref 來觸發檔案選擇器
                      }}
                      className="text-gray-700 hover:text-gray-900 cursor-pointer px-2 flex items-center flex-shrink-0"
                      type="button"
                    >
                   
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>

                    {/* 保持 textarea */}
                    <div className="ml-2 flex-1 relative">
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (e.shiftKey) {
                              // Shift + Enter 換行，不做處理
                              return;
                            } else if (question.trim() && !isLoading) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }
                        }}
                        className="w-full bg-transparent focus:outline-none text-lg resize-none"
                      ></textarea>
                      
                      {question.trim() && (
                        <button 
                          type="button"
                          className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                          onClick={() => setQuestion("")}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 圖片生成模型與數量控制放在同一列 */}
                  <div className="flex items-center text-xs text-gray-500 mt-1 ml-2 space-x-4">
                    {/* 模型選擇控件 */}
                    <div className="flex items-center relative">
                      <span>圖片生成模型: </span>
                      <span className="font-semibold ml-1">
                        {selectedModel === "sd15" && "Stable-Diffusion 1.5"}
                        {selectedModel === "sd21" && "Stable-Diffusion  2.1"}
                        {selectedModel === "sdxl" && "Stable-Diffusion XL"}
                        {selectedModel === "sd3-m" && "Stable-Diffusion 3 medium"}
                        {selectedModel === "sd35-m" && "Stable-Diffusion 3.5 medium"}
                        {selectedModel === "sd35-l" && "Stable-Diffusion 3.5 Large"}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowModelOptions(!showModelOptions);
                          setShowImageCountOptions(false); // 關閉另一個選單
                        }}
                        className="ml-2 text-blue-500 hover:text-blue-700 text-xs flex items-center"
                        type="button"
                        data-model-button="true"
                      >
                        <span>切換</span>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-3 w-3 ml-1 transition-transform duration-200 ${showModelOptions ? 'rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* 彈出式模型選單 */}
                      {showModelOptions && (
                        <div className="absolute bottom-6 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30 w-52 model-options-menu animate-slide-up">
                          {Object.entries({
                            sd15: "Stable-Diffusion 1.5",
                            sd21: "Stable-Diffusion 2.1", 
                            sdxl: "Stable-Diffusion XL",
                            "sd3-m": "Stable-Diffusion 3 medium",
                            "sd35-m": "Stable-Diffusion 3.5 medium",
                            "sd35-l": "Stable-Diffusion 3.5 Large"
                          }).map(([key, name]) => (
                            <div 
                              key={key}
                              onClick={() => {
                                setSelectedModel(key as "sd15" | "sd21" | "sdxl" | "sd3-m" | "sd35-m" | "sd35-l");
                                setShowModelOptions(false);
                              }}
                              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                                selectedModel === key ? 'bg-blue-50 text-blue-600 font-medium' : ''
                              }`}
                            >
                              {name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* 數量選擇控件 - 與模型選擇放在同一列 */}
                    <div className="flex items-center relative">
                      <span>生成數量: </span>
                      <span className="font-semibold ml-1">{selectedImageCount}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowImageCountOptions(!showImageCountOptions);
                          setShowModelOptions(false); // 關閉另一個選單
                        }}
                        className="ml-2 text-blue-500 hover:text-blue-700 text-xs flex items-center"
                        type="button"
                        data-count-button="true"
                      >
                        <span>選擇</span>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-3 w-3 ml-1 transition-transform duration-200 ${showImageCountOptions ? 'rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* 彈出式數量選單 - 一次只顯示5個，可滾动 */}
                      {showImageCountOptions && (
                        <div className="absolute bottom-6 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30 w-28 max-h-[165px] overflow-y-auto image-count-menu animate-slide-up">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                            <div 
                              key={count}
                              onClick={() => {
                                setSelectedImageCount(count);
                                setShowImageCountOptions(false);
                              }}
                              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                                selectedImageCount === count ? 'bg-blue-50 text-blue-600 font-medium' : ''
                              }`}
                            >
                              {count === 1 ? `${count}  (預設)` : `${count} `}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 將剩餘的 JSX 元素放在同一個父元素中 */}
      <>
        {/* Picture Settings Modal */}
        {showPictureSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-[90%] max-h-[90vh] flex flex-col md:flex-row gap-6 relative">
              {/* 關閉按鈕 - 絕對定位並添加背景 */}
              <button 
                onClick={() => {
                  setShowPictureSettings(false);
                  setShowUploadUI(false);
                }}
                className="absolute right-1 top-1 text-gray-500 hover:text-gray-700 bg-white rounded-full p-1.5 shadow-sm z-50 hover:bg-gray-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* 根據 showUploadUI 的狀態切換顯示內容 */}
              {!showUploadUI ? (
                // 原始的浮動視窗內容
                <>
                  {/* 左側圖片展示區 - 加上圓角與 hover 效果 */}
                  <div className="flex-1 border-2 border-black relative rounded-md hover:shadow-md transition-shadow">
                    <div className="aspect-square w-full flex items-center justify-center bg-gray-50">
                      {isLoadingModels ? (
                        <div className="flex flex-col items-center justify-center">
                          <svg className="animate-spin h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="mt-2 text-gray-500">載入中...</p>
                        </div>
                      ) : modelLoadError ? (
                        <p className="text-red-500">{modelLoadError}</p>
                      ) : currentModelImages.length > 0 && currentModelImageIndex < currentModelImages.length ? (
                        // 顯示模型圖片
                        <img 
                          src={getImageUrl(currentModelImages[currentModelImageIndex])}
                          alt={`${currentModelIndex === 0 ? "Model" : "LoRA"} image`}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        // 無圖片時顯示名稱
                        <div className="text-center text-gray-500 p-4">
                          {currentModelIndex === 0 && selectedModelInfo && (
                            <div>
                              <p className="font-medium text-lg">{selectedModelInfo.filename}</p>
                              <p className="text-sm">({selectedModelInfo.modelType})</p>
                              <p className="text-xs mt-2 text-gray-400">無預覽圖</p>
                            </div>
                          )}
                          {currentModelIndex === 1 && selectedLora && (
                            <div>
                              <p className="font-medium text-lg">{selectedLora.filename}</p>
                              <p className="text-sm">(LoRA)</p>
                              <p className="text-xs mt-2 text-gray-400">無預覽圖</p>
                            </div>
                          )}
                          {currentModelIndex === 2 && (
                            <p>請上傳自訂模型</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 左右箭頭 - 實現圖片切換功能 */}
                    <button 
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-black hover:bg-gray-100 hover:scale-110 p-1 rounded-full transition-all"
                      onClick={() => navigateImage('prev')}
                      disabled={currentModelImages.length <= 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-black hover:bg-gray-100 hover:scale-110 p-1 rounded-full transition-all"
                      onClick={() => navigateImage('next')}
                      disabled={currentModelImages.length <= 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* 底部選單和圖片數量 */}
                    <div className="absolute left-0 bottom-0 flex items-center">
                      <div 
                        className="bg-white border-2 border-black p-2 mb-2 ml-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors relative"
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                      >
                        {/* 修改這裡，直接顯示目前選取的模型或LoRA名稱，而不是類別名稱 */}
                        <span className="font-bold">
                          {currentModelIndex === 0 && selectedModelInfo 
                            ? selectedModelInfo.filename
                            : currentModelIndex === 1 && selectedLora 
                              ? selectedLora.filename
                              : modelNames[currentModelIndex]}
                        </span>
                        
                        {/* 下拉選單 */}
                        {showModelDropdown && (
                          <div className="absolute bottom-full left-0 mb-1 bg-white border-2 border-black rounded-md shadow-lg z-10 w-64 max-h-72 overflow-y-auto">
                            {/* 顯示當前模型類型作為標題 */}
                            <div className="sticky top-0 bg-gray-100 p-2 font-bold border-b border-gray-300">
                              {modelNames[currentModelIndex]}
                            </div>
                            
                            {currentModelIndex === 0 && models.map((model) => (
                              <div 
                                key={model.fileId}
                                className={`p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 ${selectedModelInfo?.fileId === model.fileId ? 'bg-blue-50' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleModelSelect(model);
                                }}
                              >
                                <div className="font-semibold">{model.filename}</div>
                                <div className="text-xs text-gray-500">
                                  {model.modelType} · {model.prettySize}
                                </div>
                              </div>
                            ))}
                            
                            {currentModelIndex === 1 && loras.map((lora) => (
                              <div 
                                key={lora.fileId}
                                className={`p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 ${selectedLora?.fileId === lora.fileId ? 'bg-blue-50' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoraSelect(lora);
                                }}
                              >
                                <div className="font-semibold">{lora.filename}</div>
                                <div className="text-xs text-gray-500">
                                  {lora.prettySize} · {new Date(lora.uploadDate).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 顯示圖片數量和當前位置 */}
                    <div className="absolute right-0 bottom-0 mb-2 mr-2">
                      <div className="flex items-center gap-2">
                        {currentModelImages.length > 0 ? (
                          <div className="flex items-center">
                            {currentModelImages.map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-2 h-2 rounded-full mx-0.5 ${i === currentModelImageIndex ? 'bg-black' : 'bg-gray-300'} cursor-pointer hover:scale-125 transition-transform`}
                                onClick={() => setCurrentModelImageIndex(i)}
                              ></div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">無圖片</span>
                        )}
                      </div>
                    </div>

                    {/* 選單文字 */}
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 ml-[-50px] rotate-90 origin-left">
                      <span className="text-black">選單</span>
                    </div>
                  </div>

                  {/* 右側控制區 */}
                  <div className="flex flex-col gap-4 w-full md:w-1/3">
                    {/* 模型選擇按鈕 */}
                    {modelNames.map((name, index) => (
                      <button 
                        key={index}
                        className={`border-2 ${currentModelIndex === index ? 'border-blue-500 bg-blue-50' : 'border-black'} p-3 text-center hover:bg-gray-100 hover:shadow-md hover:translate-y-[-2px] rounded-md transition-all`}
                        onClick={() => {
                          setCurrentModelIndex(index);
                          
                          // 更新顯示的圖片
                          if (index === 0 && selectedModelInfo?.modelImages) {
                            setCurrentModelImages(selectedModelInfo.modelImages);
                            setCurrentModelImageIndex(0);
                          } else if (index === 1 && selectedLora?.loraImages) {
                            setCurrentModelImages(selectedLora.loraImages);
                            setCurrentModelImageIndex(0);
                          } else {
                            setCurrentModelImages([]);
                          }
                        }}
                      >
                        {name}
                      </button>
                    ))}

                    {/* 上傳按鈕 */}
                    <button 
                      className="border-2 border-black p-3 text-center hover:bg-gray-100 hover:shadow-md hover:translate-y-[-2px] mt-4 rounded-md transition-all"
                      onClick={() => setShowUploadUI(true)}
                    >
                      UPLOAD
                    </button>

                    {/* 模型資訊表單 */}
                    <div className="border-2 border-black p-4 mt-4 rounded-md hover:shadow-md transition-shadow">
                      <div className="mb-2">
                        <span className="font-bold">NAME:</span>
                        <div className="border-b border-black mt-1 pb-1">
                          {currentModelIndex === 0 && selectedModelInfo ? selectedModelInfo.filename : ''}
                          {currentModelIndex === 1 && selectedLora ? selectedLora.filename : ''}
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="font-bold">MODEL TYPE:</span>
                        <div className="border-b border-black mt-1 pb-1">
                          {currentModelIndex === 0 && selectedModelInfo ? selectedModelInfo.modelType : ''}
                          {currentModelIndex === 1 ? 'LoRA' : ''}
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="font-bold">SOURCE:</span>
                        <div className="border-b border-black mt-1 pb-1">
                          {currentModelIndex === 0 && selectedModelInfo ? (selectedModelInfo.originalFilename || '-') : ''}
                          {currentModelIndex === 1 && selectedLora ? (selectedLora.originalFilename || '-') : ''}
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="font-bold">SIZE:</span>
                        <div className="border-b border-black mt-1 pb-1">
                          {currentModelIndex === 0 && selectedModelInfo ? selectedModelInfo.prettySize : ''}
                          {currentModelIndex === 1 && selectedLora ? selectedLora.prettySize : ''}
                        </div>
                      </div>
                      <div className="mb-2 border-b  overflow-y-auto max-h-[4.5em] leading-[1.5em]">
                        <span className="font-bold">DESCRIPTION:</span>
                        <div className="border-b border-black mt-1 pb-1">
                          {currentModelIndex === 0 && selectedModelInfo ? (selectedModelInfo.description || '-') : ''}
                          {currentModelIndex === 1 && selectedLora ? (selectedLora.description || '-') : ''}
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="font-bold">IMAGES:</span>
                        <div className="border-b border-black mt-1 pb-1">
                          {currentModelImages.length > 0 
                            ? `${currentModelImageIndex + 1} / ${currentModelImages.length}`
                            : 'No images'
                          }
                        </div>
                          {currentModelIndex === 0 && selectedModelInfo ? (selectedModelInfo.fileId|| '-') : ''}
                          {currentModelIndex === 1 && selectedLora ? (selectedLora.fileId || '-') : ''}
                      </div>
                    </div>
                      <button 
                      className="border-2 border-black p-3 text-center hover:bg-gray-100 hover:shadow-md hover:translate-y-[-2px] mt-4 rounded-md transition-all"
                      onClick={() =>{
                        ApplyModelLora();
                        setShowPictureSettings(false);
                      }
                    }//等等回來
                      > APPLY </button>
                </div>
                </>
              ) : (
                // 上傳UI部分
                <>
                  {/* 左上角返回按鈕 - 加上 hover 效果 */}
                  <button 
                    onClick={() => setShowUploadUI(false)}
                    className="absolute left-1 top-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 hover:scale-110 p-1 rounded-full transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <div className="flex flex-col md:flex-row gap-6 w-full">
                    {/* 左側內容 */}
                    <div className="flex-1 flex flex-col gap-4">
                      {/* 檔案上傳區域 - 修改為可點擊和顯示上傳中的狀態 */}
                      <div className="border-2 border-black p-4 rounded-md hover:shadow-md transition-shadow">
                        <p className="text-center font-bold mb-2">檔案上傳區</p>
                        <div 
                          className={`border-2 border-dashed ${uploadingFile ? 'border-green-500 bg-green-50' : 'border-gray-300'} rounded-md p-6 flex flex-col items-center cursor-pointer hover:bg-gray-50 relative ${isModelUploading ? 'pointer-events-none' : ''}`}
                          onClick={() => modelFileInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleModelFileDrop}
                        >
                          {isModelUploading ? (
                            <div className="flex flex-col items-center justify-center">
                              <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p className="mt-2 text-gray-600">上傳中，請稍候...</p>
                            </div>
                          ) : uploadingFile ? (
                            <div className="flex flex-col items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <p className="mt-2 text-gray-700">{uploadingFile.name}</p>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUploadingFile(null);
                                }}
                                className="mt-3 px-2 py-1 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100 transition-colors"
                              >
                                移除
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <p className="mt-2 text-gray-500">拖放檔案或點擊上傳</p>
                              <p className="text-xs text-gray-400 mt-1">支援 .safetensors, .ckpt, .pt, .bin, .zip 檔案</p>
                            </div>
                          )}
                        </div>
                        
                        {/* 隱藏的檔案輸入元素 */}
                        <input
                          type="file"
                          ref={modelFileInputRef}
                          onChange={(e) => handleModelFileUpload(e.target.files)}
                          accept=".safetensors,.ckpt,.pt,.bin,.zip"
                          style={{ display: 'none' }}
                        />
                      </div>
                      
                      {/* 圖片上傳、瀏覽區 - 修改為可顯示預覽圖片 */}
                      <div className="border-2 border-black p-4 rounded-md hover:shadow-md transition-shadow">
                        <p className="text-center font-bold mb-2">圖片上傳、瀏覽區</p>
                        <div 
                          className={`border-2 border-dashed ${filePreview ? 'border-green-500' : 'border-gray-300'} rounded-md p-6 flex flex-col items-center cursor-pointer hover:bg-gray-50 min-h-[200px] relative`}
                          onClick={() => modelImageInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleModelImageDrop}
                        >
                          {filePreview ? (
                            <div className="flex flex-col items-center">
                              <img 
                                src={filePreview} 
                                alt="預覽圖" 
                                className="max-h-[150px] max-w-full mb-2 rounded-md" 
                              />
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (filePreview) {
                                    URL.revokeObjectURL(filePreview);
                                  }
                                  setFilePreview(null);
                                }}
                                className="mt-2 px-2 py-1 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100 transition-colors"
                              >
                                移除圖片
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="mt-2 text-gray-500">拖放圖片或點擊上傳</p>
                              <p className="text-xs text-gray-400 mt-1">支援常見圖片格式</p>
                            </div>
                          )}
                        </div>
                        
                        {/* 隱藏的圖片輸入元素 */}
                        <input
                          type="file"
                          ref={modelImageInputRef}
                          onChange={(e) => handleModelImageUpload(e.target.files)}
                          accept="image/*"
                          style={{ display: 'none' }}
                        />
                      </div>

                      {/* 錯誤或成功訊息顯示 */}
                      {uploadMessage && (
                        <div className={`mt-2 p-3 rounded-md ${
                          uploadMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {uploadMessage.message}
                        </div>
                      )}
                    </div>
                    
                    {/* 右側內容 - 根據當前選擇的模型類型顯示不同的表單內容 */}
                    <div className="w-full md:w-1/3 flex flex-col">
                      {/* 主要模型選項 - 加上選取效果 */}
                      <div className="flex gap-4 mb-4">
                        <button 
                          className={`border-2 ${modelType === "CUSTOM MODEL" ? "border-blue-500 bg-blue-50" : "border-black"} p-3 text-center hover:bg-gray-100 hover:shadow-md hover:translate-y-[-2px] rounded-md flex-1 transition-all`}
                          onClick={() => setModelType("CUSTOM MODEL")}
                        >
                          CUSTOM MODEL
                        </button>
                        <button 
                          className={`border-2 ${modelType === "LORA" ? "border-blue-500 bg-blue-50" : "border-black"} p-3 text-center hover:bg-gray-100 hover:shadow-md hover:translate-y-[-2px] rounded-md flex-1 transition-all`}
                          onClick={() => setModelType("LORA")}
                        >
                          LORA
                        </button>
                      </div>
                      
                      {/* SD 版本選擇按鈕 - 加上選取效果 */}
                      <div className="border-2 border-black p-4 rounded-md mb-4 hover:shadow-md transition-shadow">
                        <p className="font-bold mb-2">模型類型:</p>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <button 
                            className={`p-2 text-center text-sm rounded-md transition-colors ${
                              sdVersion === "sd15" ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                            onClick={() => setSdVersion("sd15")}
                            disabled={isModelUploading}
                          >
                            SD 1.5
                          </button>
                          <button 
                            className={`p-2 text-center text-sm rounded-md transition-colors ${
                              sdVersion === "sd21" ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                            onClick={() => setSdVersion("sd21")}
                            disabled={isModelUploading}
                          >
                            SD 2.1
                          </button>
                          <button 
                            className={`p-2 text-center text-sm rounded-md transition-colors ${
                              sdVersion === "sdxl" ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                            onClick={() => setSdVersion("sdxl")}
                            disabled={isModelUploading}
                          >
                            SD XL
                          </button>
                          <button 
                            className={`p-2 text-center text-sm rounded-md transition-colors ${
                              sdVersion === "sd3-m" ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                            onClick={() => setSdVersion("sd3-m")}
                            disabled={isModelUploading}
                          >
                            SD 3 - M
                          </button>
                          <button 
                            className={`p-2 text-center text-sm rounded-md transition-colors ${
                              sdVersion === "sd35-m" ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                            onClick={() => setSdVersion("sd35-m")}
                            disabled={isModelUploading}
                          >
                            SD 3.5 - M
                          </button>
                          <button 
                            className={`p-2 text-center text-sm rounded-md transition-colors ${
                              sdVersion === "sd35-l" ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                            onClick={() => setSdVersion("sd35-l")}
                            disabled={isModelUploading}
                          >
                            SD 3.5 - L
                          </button>
                        </div>
                      </div>
                      
                      {/* 描述 - 加上可輸入文字功能 */}
                      <div>
                        <p className="font-bold mb-2">DESCRIPTION:</p>
                        <textarea
                          className="border-2 border-black rounded-md p-2 w-full h-20 hover:border-blue-400 hover:shadow-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          value={modelDescription}
                          onChange={(e) => setModelDescription(e.target.value)}
                          placeholder="輸入模型描述..."
                        ></textarea>
                      </div>
                      
                      {/* 或文字顯示 */}
                      <div className="text-center my-4">
                        <p>OR</p>
                      </div>
                      
                      {/* 檔案路徑 - 改為可輸入網址的文字框 */}
                      <div>
                        <p className="font-bold mb-2">FILE PATH:</p>
                        <input
                          type="text"
                          className="border-2 border-black rounded-md p-2 h-10 w-full hover:border-blue-400 hover:shadow-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="輸入模型網址(當前僅支援civitai)..."
                          value={modelUrl}
                          onChange={(e) => setModelUrl(e.target.value)}
                        />
                      </div>
                      
                      {/* UPLOAD 按鈕 - 修改為呼叫上傳函數並顯示上傳中狀態 */}
                      <div className="flex justify-end mt-auto pt-4">
                        <button 
                          className={`border-2 border-black p-3 text-center rounded-md transition-all ${
                            isModelUploading 
                              ? 'opacity-70 cursor-not-allowed' 
                              : 'hover:bg-gray-100 hover:shadow-md hover:translate-y-[-2px]'
                          }`}
                          onClick={uploadModelOrLora}
                          disabled={isModelUploading}
                        >
                          {isModelUploading ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              上傳中...
                            </div>
                          ) : (
                            "UPLOAD"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 添加隱藏的檔案輸入元素 */}
        <input
          type="file"
          id="file-upload-input"
          ref={fileInputRef}
          onChange={(e) => handleFileUpload(e.target.files)}
          accept="image/*"
          multiple
          style={{ display: 'none' }}
        />

        {/* 添加隱藏的模型圖片輸入元素 */}
        <input
          type="file"
          ref={modelImageInputRef}
          onChange={(e) => handleModelImageUpload(e.target.files)}
          accept="image/*"
          style={{ display: 'none' }}
        />
      </>
    </div>
  );
};