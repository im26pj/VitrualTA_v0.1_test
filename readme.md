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

**git 操作相關筆記**

**首次操作**
git config --global user.email "<您的常用電郵地址>"
git config --global user.name "<您的暱稱>"


**首次取得專案**
git clone 網址 ex:github專案網址

**查詢檔案還原點**
git log --oneline

**單一檔案退回到某一版本**
這個可以確保每個版本紀錄都被保留
三個操作都要做

git checkout 版本ID --還原檔案的名稱及附檔名
git status 進入暫存區
git commit -m "提示詞用於識別變更"
EX: git checkout 50f9de9 --readme.md

**所有檔案退回到某一版本**
**這東西務必慎用在在還原點後的版本都會不見**
**是所有人在git hub上的檔案務必注意**
**確定要執行請先為當前版本做備份**


git reset --hard 版本號


**取得其他人做的更新**
git pull

**建立分支**
git checkout -b 分支名稱(建議英文)

**你媽**

