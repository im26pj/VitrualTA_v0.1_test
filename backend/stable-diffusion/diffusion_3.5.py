# generate_gridfs.py for SD 3.5
import os, sys, json, io
import datetime
from diffusers import BitsAndBytesConfig, SD3Transformer2DModel, StableDiffusion3Pipeline
import torch
from pymongo import MongoClient
import gridfs

def main():
    # 1. 從命令行接收參數
    if len(sys.argv) < 4:
        print(json.dumps({"error": "需要 prompt, user_id, chat_id 三个参数"}))
        sys.exit(1)
    
    prompt, userid, chat_id = sys.argv[1], sys.argv[2], sys.argv[3]
    
    # 2. 初始化 Diffusers pipeline
    try:
        # 使用 medium 模型
        model_id = "stabilityai/stable-diffusion-3.5-medium"

        # 設置量化配置
        nf4_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16
        )
        
        # 加載 transformer 模型
        model_nf4 = SD3Transformer2DModel.from_pretrained(
            model_id,
            token="### TOKEN 填入這 ***",  # 請確保此 token 有效或使用環境變量
            subfolder="transformer",
            quantization_config=nf4_config,
            torch_dtype=torch.bfloat16
        )
        
        # 加載完整 pipeline
        pipeline = StableDiffusion3Pipeline.from_pretrained(
            model_id, 
            token="### TOKEN 填入這 ***",
            transformer=model_nf4,
            torch_dtype=torch.bfloat16
        )
        pipeline.enable_model_cpu_offload()
        
        # 3. 生成圖像
        image = pipeline(
            prompt=prompt,
            num_inference_steps=40,
            guidance_scale=4.5,
            max_sequence_length=512,
        ).images[0]

        # 4. 把 PIL.Image 轉為 PNG bytes
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        img_bytes = buf.getvalue()

        # 5. 連接 MongoDB 並寫入 GridFS
        mongo_uri = os.getenv("vtadb", "mongodb://localhost:27017")
        client = MongoClient(mongo_uri)
        db = client.get_database(os.getenv("vtadb", "vtadb"))
        
        # 使用 images 集合名稱，與 diffusion_1.5.py 保持一致
        images = gridfs.GridFS(db, collection="images")

        file_id = images.put(
            img_bytes,
            filename="generated_sd35.png",
            metadata={
                "userId": userid,
                "contentType": "image/png",
                "uploadDate": datetime.datetime.utcnow(),
                "chat_id": chat_id,
                "model": "stable-diffusion-3.5-medium"  # 添加模型資訊
            }
        )

        # 6. 返回 JSON
        print(json.dumps({"_id": str(file_id)}))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
