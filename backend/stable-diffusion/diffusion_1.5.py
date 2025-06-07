# generate_gridfs.py
import os, sys, json, io
from diffusers import StableDiffusionPipeline
import torch
from pymongo import MongoClient
import gridfs
from PIL import Image
import datetime  # Ensure datetime is imported

def main():
    # 1. 從命令行接 prompt
    if len(sys.argv) < 4:
        print(json.dumps({"error": "需要 prompt, user_id, chat_id 三个參數"}))
        sys.exit(1)
    prompt, userid, chat_id = sys.argv[1], sys.argv[2], sys.argv[3]

    # 2. 初始化 Diffusers pipeline
    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float16,
        #use_auth_token=True
    ).to("cuda")

    # 3. 生成圖像
    image = pipe(prompt, num_inference_steps=40, guidance_scale=4.5).images[0]

    # 4. 把 PIL.Image 轉為 PNG bytes
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    img_bytes = buf.getvalue()

    # 5. 連接 MongoDB 並寫入 GridFS
    mongo_uri = os.getenv("vtadb", "mongodb://localhost:27017")
    client = MongoClient(mongo_uri)
    db = client.get_database(os.getenv("vtadb", "vtadb"))
    images = gridfs.GridFS(db, collection="images")

    file_id = images.put(img_bytes,
                     filename="generated.png",
                     metadata={
                         "userId": userid,
                         "contentType": "image/png",
                         "uploadDate": datetime.datetime.utcnow(),
                         "chat_id": chat_id,
                         "model": "stable-diffusion-1.5"  # 添加模型資訊
                     })

    # 6. 回傳 JSON
    print(json.dumps({"_id": str(file_id)}))

if __name__ == "__main__":
    main()
