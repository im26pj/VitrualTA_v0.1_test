import sys
import ollama
from PyQt5.QtWidgets import QApplication, QMainWindow
from ollama_ui import Ui_MainWindow
from Save_Chat import Save_Chat_History

#self 的用法是python中原生支持的 他會把變數變成實例變數 !須注意self變數的值是共享的 且由於他的作用是代指當前對象所以不用被顯性的傳遞
class MyApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.ui = Ui_MainWindow()  # 實例化 UI 類
        self.ui.setupUi(self)  # 設定 UI 佈局
        
        self.ui.Button_sent.clicked.disconnect()#斷開上一次button的連結 #特殊情況才需要 ex多次初始化 多次呼叫等
        self.ui.Button_sent.clicked.connect(self.on_Button_sent_clicked)#連結按鍵與事件的連結 
        
        #初始化變數
        self.conversation_history = []
        
        #設定ollama初始狀態 EX:語言
        setlenglanguague = "{回應請使用**繁體中文**}" #再"前加入\躲過保留符號
        init_ollama = ollama.chat(
        model = "llama3",
        messages = [{"role":"user" ,"content":setlenglanguague}# 傳入語言prompt
                    
                   ]
        )
        
        setres = init_ollama["message"]["content"]
        #print(setres)
        self.conversation_history.append({"role": "assistant", "content": setres})
        
    def on_Button_sent_clicked(self):
        UserInput = self.ui.Input_area.toPlainText()#接收使用者輸入
        self.ui.Input_area.clear()#清除輸入欄
        self.ui.Chat.append(UserInput)#使用者輸入顯示到上方     
        self.conversation_history.append({"role": "user", "content": UserInput})#將使用者問題加入對話歷史

        #呼叫ollama
        response = ollama.chat(
        model = "llama3",
        messages = self.conversation_history,  # 傳入對話歷史
        keep_alive = 30 #保持30s的連線狀態不斷線
        )
        
        # 取得模型的回應並打印
        answer = response["message"]["content"]
        self.ui.Chat.append(f"Assistant: {answer}")#llama3回復顯示到上方 
        #print(f"Assistant: {answer}")

        
        self.conversation_history.append({"role": "assistant", "content": answer})# 將助理的回應加入對話歷史，以實現記憶
        #print(self.conversation_history)

    def closeEvent(self, event): #在pyqt中這是特殊的事件不用再init中串接起來只需要將function取名為closeEvent(self,event)就好
        Save_Chat_History(self.conversation_history)#把本次對話紀錄存入json檔案中
        print("檔案自動儲存完成")
        event.accept()
        
if __name__ == "__main__":
    # QApplication是最底層的控制套件必須寫在最上面啟用
    app = QApplication(sys.argv)
    window = MyApp()  # 創建主視窗
    window.show()  # 顯示視窗
    
    sys.exit(app.exec_())  # 開始事件迴圈
