** 正式環境 **

    環境安裝(只須執行一次)
     STEP1 (cmd) -> cd backend -> npm install
     STEP2 (cmd) -> cd ..\frontend -> npm install 
     STEP3 (cmd) -> npm run build
     STEP4 (cmd) -> cd ..\backend\stable-diffusion ->python3.11 -m venv .graphenv
     STEP5 windows(使用者) -> .graphenv\Scripts\activate 
     STEP5 Linux(使用者) -> source .graphenv/bin/activate
     STEP6 pip install --upgrade pip
     STEP7 pip install -r requirements.txt 
     STEP8 前往https://ollama.com/ 安裝ollama
     STEP9 (cmd) -> ollama pull llama3.2-vision:11b

    使用
    STEP0(可選) (cmd) -> ollama serve
    STEP0(可選) cloudflared tunnel --url http://localhost:3000 ->他會給你一個開隧道讓局網外也可以連線使用
    STEP1 (cmd) -> cd frontend -> npm start -> 前往網址http://localhost:5000/choose2 -> 或http://其他主機網路位置:5000/choose2

** 測試環境(前後端分離) **    
    前端
     STEP1 (cmd) -> cd frontend
     STEP2 (cmd) -> npm run dev

    後端
     STEP1 (cmd) -> cd backend
     STEP2 (cmd) -> npm start

    ollama(可選)
    安裝後預設自動啟動，但cmd啟動可以方便監看連線狀況
     STEP0 (cmd) -> ollama serve

** 背景環境 **
    cuda gpu -> Nvidia Toolkit cu124
    cloudflare(可選)
    ollama
    mongodb -> 建立 connection ->名稱vtadb ->建立資料庫 -> 名稱vtadb
    前往hugging face申請token(如果不使用可以忽略) -> https://huggingface.co/stabilityai/stable-diffusion-3.5-medium -> 填入backend\stable-diffusion\diffusion_3.5.py token參數內

** 簡介 **
    使用模型
    文字模型 llama3.2-vision:11b
    圖片模型 stabilityai/stable-diffusion-3.5-medium / runwayml/stable-diffusion-v1-5