import json
import os

def Save_Chat_History(arg):
    # 獲取當前文件的目錄
    current_dir = os.path.dirname(__file__)
    json_file_path = os.path.join(current_dir, "Chat_History.json")
    
    jsonFile = open(json_file_path, "a",encoding="utf-8") #a = 續寫
    json.dump(arg, jsonFile, indent=2,ensure_ascii=False)#ensure_ascii=False 不使用ascii編碼維持中文文字儲存
    jsonFile.close()

