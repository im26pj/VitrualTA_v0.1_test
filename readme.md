VirtualTA -beta

使用函式庫
ollama
pyqt5
sys
ollama_ui(自行撰寫)

程式組成
ollama_ui.py -> 設定ui介面 -> QTdesigner工具設計後cmd指令轉譯
VirtualTA.py -> main func

**首次使用**
請再檔案requirement.txt所在位置執行以下指令
pip install -r requirements.txt 

**pip使用的版本**
pip 23.2.1 #如果安裝出現錯誤可以檢查pip的版本是否過於老舊、或不支持

**調用GPU資源**
Nvidia CUDA Toolkit 目前使用版本12.6

**檢查是否有使用GPU資源**
執行以下命令
ollama ps

該Processor列將顯示模型載入到哪個記憶體：
100% GPU表示模型已完全載入到 GPU 中
100% CPU意味著模型完全載入到系統記憶體中
48%/52% CPU/GPU表示模型已部分載入到 GPU 和系統記憶體中