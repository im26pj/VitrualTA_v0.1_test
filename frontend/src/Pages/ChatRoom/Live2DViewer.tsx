import React, { useRef, useEffect, useState } from 'react';
import * as PIXI from 'pixi.js';

interface Live2DViewerProps {
  modelPath: string;
  currentText?: string; // 新增這個 prop
}

// 修改 loadScript 函數以返回 Promise
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
};

const Live2DViewer: React.FC<Live2DViewerProps> = ({ modelPath, currentText }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [status, setStatus] = useState<{ message: string; isError: boolean }>({
    message: '準備初始化...',
    isError: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let model: PIXI.live2d.Live2DModel | null = null;

    // **新增**：將模型自適應並置中的函數
    const fitAndCenterModel = () => {
      if (!appRef.current || !model) return;

      const canvas = appRef.current.view as HTMLCanvasElement;
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // 避免模型尺寸為 0 時出錯
      if (model.width === 0 || model.height === 0) {
        console.warn("Model dimensions are zero. Skipping fit and center.");
        return;
      }
      
      // 計算縮放比例，並留出 5% 的邊界
      const scaleX = canvasWidth / model.width * 0.95;
      const scaleY = canvasHeight / model.height * 0.95;
      
      // 取較小的比例以確保模型完整顯示
      const scale = Math.min(scaleX, scaleY);

      model.scale.set(scale);

      // 將模型放在左上角，加上一點內邊距
      const padding = 20; // 可以調整這個值來改變與邊緣的距離
      model.position.set(
        (model.width * scale) / 2 + padding,  // x 位置
        (model.height * scale) / 2 + padding  // y 位置
      );
    };

    const initLive2D = async () => {
      try {
        setStatus({ message: '正在載入核心腳本...', isError: false });
        await loadScript('/pic/live2dcubismcore.min.js');
        await loadScript('/pic/pixi.min.js');
        await loadScript('/pic/cubism4.js');

        if (!window.PIXI?.live2d) {
          throw new Error('Live2D plugin not loaded');
        }

        setStatus({ message: '正在初始化渲染器...', isError: false });
        const app = new PIXI.Application({
          view: canvasRef.current!,
          resizeTo: canvasRef.current!.parentElement!,
          backgroundAlpha: 0,
          antialias: true,
          eventMode: 'passive',
          eventFeatures: {
            move: true,
            globalMove: true,
            click: true,
            wheel: true
          }
        });
        appRef.current = app;

        setStatus({ message: '正在載入模型...', isError: false });
        model = await window.PIXI.live2d.Live2DModel.from(modelPath);
        
        app.stage.addChild(model);
        
        // **修改**：調用自適應函數，而不是手動設置
        fitAndCenterModel();

        // **新增**：監聽 PIXI 的 resize 事件，當 canvas 尺寸改變時重新自適應
        app.renderer.on('resize', fitAndCenterModel);

        model.eventMode = 'static';
        model.cursor = 'pointer';

        model.on('pointerdown', () => {
          // 您可以在這裡添加點擊互動，例如隨機播放動畫
          const motionGroups = Object.keys(model?.internalModel.motionManager.motionGroups || {});
          if (motionGroups.length > 0) {
            // 過濾掉 idle 動畫，以獲得更有趣的互動
            const tappableGroups = motionGroups.filter(group => group.toLowerCase() !== 'idle');
            const group = tappableGroups[Math.floor(Math.random() * tappableGroups.length)];
            model?.motion(group);
          }
        });
        
        setStatus({ message: '', isError: false });

      } catch (error: any) {
        console.error('Live2D 初始化錯誤:', error);
        setStatus({
          message: `錯誤：${error.message}`,
          isError: true
        });
      }
    };

    initLive2D();

    return () => {
      if (appRef.current) {
        // **新增**：清理時移除 resize 監聽器
        appRef.current.renderer.off('resize', fitAndCenterModel);
        appRef.current.stage.removeAllListeners();
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      model = null;
    };
  }, [modelPath]);

  // 在這裡監聽 currentText 的變化
  useEffect(() => {
    if (currentText && appRef.current?.stage) {
      // 這裡可以觸發 Live2D 模型的說話動作
      // 根據你的 Live2D 模型實作來調用相應的方法
      // 例如：model.motion('talk')
    }
  }, [currentText]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {status.message && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: status.isError ? '#ffcdd2' : '#ffffff',
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          padding: '10px',
          borderRadius: '8px',
          zIndex: 10,
          fontSize: '14px',
          lineHeight: '1.5',
        }}>
          {status.message}
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default Live2DViewer;