# generate_gridfs.py for SD 3.5
import os
import sys
import json
import torch
import io
import safetensors
from safetensors.torch import load_file
from diffusers import StableDiffusionPipeline, DiffusionPipeline, StableDiffusionXLPipeline
from diffusers.models.attention_processor import LoRAAttnProcessor
from subprocess import run, PIPE
import datetime
from pymongo import MongoClient
import gridfs
from PIL import Image
# from dotenv import load_dotenv

# 載入環境變量
try:
  from dotenv import load_dotenv
  load_dotenv()
except ImportError:
  print("[INFO] python-dotenv not installed, skipping .env loading")

# 判斷是否為 Custom Diffusion 權重 (使用安全方式載入檔案)
def is_custom_diffusion_lora(lora_path):
    try:
        # 使用 safetensors 讀取檔案但不使用 metadata_only 參數
        state_dict = load_file(lora_path)
        keys = state_dict.keys()
        
        for key in keys:
            if "lora_te_text_model_encoder" in key or "lora_unet" in key:
                return True
    except Exception as e:
        print(f"[WARN] 無法分析權重檔案: {e}")
    return False

# 判斷是否為 WebUI/Kohya 權重 (使用安全方式載入檔案)
def is_webui_lora(lora_path):
    try:
        # 使用 safetensors 讀取檔案但不使用 metadata_only 參數
        state_dict = load_file(lora_path)
        keys = state_dict.keys()
        
        # WebUI/Kohya LoRA 的特徵
        webui_patterns = [
            "lora_unet_down_blocks",
            "lora_unet_mid_block",
            "lora_unet_up_blocks",
            "lora_te_text_model"
        ]
        
        for key in keys:
            for pattern in webui_patterns:
                if pattern in key:
                    return True
        
        # 檢查是否含有常見的 Kohya 模式
        kohya_patterns = ["alpha", "lokr", "hada"]
        for key in keys:
            for pattern in kohya_patterns:
                if pattern in key:
                    return True
    except Exception as e:
        print(f"[WARN] 無法分析權重檔案: {e}")
    return False

# SD 3.5 LoRA 轉換函數
def convert_lora_for_sd35(lora_path, out_dir):
    try:
        os.makedirs(out_dir, exist_ok=True)
        
        print(f"[INFO] 開始轉換 LoRA 為 SD 3.5 格式: {lora_path}")
        
        # 嘗試使用最新的轉換工具
        try:
            result = run([
                sys.executable, "-m", "diffusers.convert_lora_safetensor_to_diffusers",
                "--lora_pt_path", lora_path,
                "--dump_path", out_dir
            ], check=True, stdout=PIPE, stderr=PIPE)
            print(f"[INFO] 成功轉換 LoRA 為 SD 3.5 格式: {out_dir}")
            return True
        except Exception as e:
            print(f"[WARN] diffusers 轉換工具失敗: {e}")
            
            # 備用方案：直接複製檔案
            import shutil
            dst_path = os.path.join(out_dir, "pytorch_lora_weights.safetensors")
            shutil.copy2(lora_path, dst_path)
            print(f"[INFO] 已複製 LoRA 權重至 {dst_path} (備用方案)")
            return True
    except Exception as e:
        print(f"[ERROR] 轉換 SD 3.5 LoRA 失敗: {e}")
        return False

# 使用 PEFT 庫載入 LoRA for SD 3.5
def load_lora_with_peft_sd35(pipe, lora_path, scale=0.75):
    try:
        print(f"[INFO] 嘗試使用 PEFT 載入 SD 3.5 LoRA: {lora_path}")
        
        # 確保有必要的套件
        try:
            import peft
            from peft import PeftModel
        except ImportError:
            print(f"[INFO] 安裝 peft...")
            run([sys.executable, "-m", "pip", "install", "peft"], check=True)
            import peft
            from peft import PeftModel
        
        # SD 3.5 的 PEFT 配置可能需要調整
        config = peft.LoraConfig(
            r=8,  # SD 3.5 可能需要更高的秩
            lora_alpha=scale * 8,
            target_modules=["q_proj", "k_proj", "v_proj", "out_proj", "to_q", "to_k", "to_v", "to_out.0"],
            bias="none",
            task_type="TEXT_GENERATION"
        )
        
        # 使用 PEFT 將模型轉換為 LoRA 模型
        pipe.unet = PeftModel.from_pretrained(pipe.unet, lora_path, adapter_name="default")
        if hasattr(pipe, "text_encoder"):
            pipe.text_encoder = PeftModel.from_pretrained(pipe.text_encoder, lora_path, adapter_name="default")
        
        # 設置縮放因子
        pipe.unet.set_adapter_scale(scale)
        if hasattr(pipe, "text_encoder"):
            pipe.text_encoder.set_adapter_scale(scale)
        
        print(f"[INFO] 成功使用 PEFT 載入 SD 3.5 LoRA")
        return True
    except Exception as e:
        print(f"[ERROR] PEFT 載入 SD 3.5 LoRA 失敗: {e}")
        return False

# 使用原生方式載入 LoRA for SD 3.5
def apply_lora_weights_sd35(pipe, lora_path, scale=0.75):
    try:
        print(f"[INFO] 使用原生方式載入 SD 3.5 LoRA: {lora_path}")
        
        # 檢查 pipe 類型，針對 SD 3.5 可能需要特殊處理
        pipe_class = pipe.__class__.__name__
        print(f"[INFO] 模型類型: {pipe_class}")
        
        # SD 3.5 原生 API
        try:
            pipe.load_lora_weights(lora_path, adapter_name="default")
            pipe.set_adapters(["default"], adapter_weights=[scale])
            print(f"[INFO] 成功使用原生 API 載入 SD 3.5 LoRA: {lora_path}")
            return True
        except Exception as e1:
            print(f"[WARN] SD 3.5 原生 API 載入失敗: {e1}")
            
            # 嘗試使用其他方法
            try:
                # SD 3.5 備用 API
                temp_dir = os.path.join(os.path.dirname(lora_path), "temp_sd35_converted")
                os.makedirs(temp_dir, exist_ok=True)
                
                if convert_lora_for_sd35(lora_path, temp_dir):
                    pipe.load_lora_weights(temp_dir)
                    print(f"[INFO] 成功使用轉換後載入 SD 3.5 LoRA")
                    return True
            except Exception as e2:
                print(f"[WARN] SD 3.5 備用 API 載入失敗: {e2}")
                
                # 最後嘗試: 使用 PEFT 方法
                return load_lora_with_peft_sd35(pipe, lora_path, scale)
    except Exception as e:
        print(f"[ERROR] 所有 SD 3.5 LoRA 載入方法均失敗: {e}")
        return False

# SD 3.5 特定的 LoRA 調整方法
def adjust_lora_for_sd35(pipe, lora_path, scale=0.75):
    try:
        print(f"[INFO] 嘗試調整 LoRA 以適應 SD 3.5: {lora_path}")
        
        # 載入 LoRA 權重
        state_dict = load_file(lora_path)
        keys = list(state_dict.keys())
        
        # 檢查是否可能與 SD 3.5 相容
        sd35_compatible = any("transformer_" in k for k in keys) or any("text_encoder_" in k for k in keys)
        
        if sd35_compatible:
            print(f"[INFO] 識別為可能與 SD 3.5 相容的 LoRA")
            # 使用原生方法嘗試載入
            return apply_lora_weights_sd35(pipe, lora_path, scale)
        else:
            print(f"[INFO] LoRA 需要調整以適應 SD 3.5")
            
            # 嘗試轉換和調整 LoRA 權重
            temp_dir = os.path.join(os.path.dirname(lora_path), "temp_adjusted_sd35")
            os.makedirs(temp_dir, exist_ok=True)
            
            if convert_lora_for_sd35(lora_path, temp_dir):
                try:
                    pipe.load_lora_weights(temp_dir)
                    print(f"[INFO] 成功載入調整後的 SD 3.5 LoRA")
                    return True
                except Exception as e:
                    print(f"[WARN] 載入調整後的 LoRA 失敗: {e}")
                    
                    # 最後嘗試: 使用 PEFT 方法
                    return load_lora_with_peft_sd35(pipe, lora_path, scale)
            
            return False
    except Exception as e:
        print(f"[ERROR] 調整 LoRA 失敗: {e}")
        return False

def load_model_sd35(model_path, user_token=None):
    """智能載入 SD 3.5 模型，包含 4 位元量化及 CPU offload"""
    print(f"[INFO] 嘗試載入 SD 3.5 模型: {model_path}")
    
    # 處理預設模型名稱
    model_name_map = {
        "default": "stabilityai/stable-diffusion-3.5-medium", 
        "sd35": "stabilityai/stable-diffusion-3.5-medium",
        "sd35-m": "stabilityai/stable-diffusion-3.5-medium",
        "sd35-l": "stabilityai/stable-diffusion-3.5-large",
        "sd3-m": "stabilityai/stable-diffusion-3-medium-diffusers",
    }
    
    if model_path in model_name_map:
        model_path = model_name_map[model_path]
        print(f"[INFO] 使用預設 SD 3.5 模型: {model_path}")
    
    # 如果沒有提供 user_token，則使用環境變量中的預設值
    token = user_token or os.getenv("DEFAULT_USER_TOKEN")
    if token:
        print(f"[INFO] 使用 Hugging Face 授權令牌")
    else:
        print(f"[WARN] 未找到 Hugging Face 授權令牌，可能無法訪問需要授權的模型")
    
    try:
        print(f"[INFO] 以 4 位元量化載入 SD 3.5 模型")
        
        # 載入必要的庫
        try:
            from diffusers import BitsAndBytesConfig, SD3Transformer2DModel
            from diffusers import StableDiffusion3Pipeline
            import torch
        except ImportError as e:
            print(f"[INFO] 安裝必要的庫: {e}")
            run([sys.executable, "-m", "pip", "install", "--upgrade", "diffusers", "transformers", "accelerate", "bitsandbytes"], check=True)
            from diffusers import BitsAndBytesConfig, SD3Transformer2DModel
            from diffusers import StableDiffusion3Pipeline
            import torch
            
        # 設定 4 位元量化配置
        nf4_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16
        )
        
        # 先載入並量化 transformer 模型
        print(f"[INFO] 載入並量化 transformer 模型")
        model_nf4 = SD3Transformer2DModel.from_pretrained(
            model_path,
            subfolder="transformer",
            quantization_config=nf4_config,
            torch_dtype=torch.bfloat16,
            token=token
        )
        
        # 載入完整管道，使用量化後的 transformer
        print(f"[INFO] 載入完整 pipeline，使用量化後的 transformer")
        pipe = StableDiffusion3Pipeline.from_pretrained(
            model_path, 
            transformer=model_nf4,
            torch_dtype=torch.bfloat16,
            token=token
        )
        
        # 啟用 CPU offload 以節省 VRAM
        print(f"[INFO] 啟用模型 CPU offload")
        pipe.enable_model_cpu_offload()
        
        return pipe
        
    except Exception as e:
        print(f"[ERROR] 4 位元量化載入失敗: {e}")
        print(f"[INFO] 嘗試標準方式載入...")
        
        try:
            # 嘗試標準載入方式 (無量化)
            pipe = DiffusionPipeline.from_pretrained(
                model_path,
                torch_dtype=torch.float16,
                variant="fp16",
                token=token
            ).to("cuda")
            return pipe
        except Exception as e2:
            print(f"[ERROR] 標準載入方式失敗: {e2}")
            print(f"[INFO] 嘗試回退到 SD 3.5-m 模型...")
            
            try:
                from diffusers import BitsAndBytesConfig, StableDiffusion3Pipeline
                import torch
                
                # 設定 4 位元量化配置（與主要載入方式一致）
                nf4_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_compute_dtype=torch.bfloat16
                )
                
                # 直接使用量化設定載入完整模型
                pipe = StableDiffusion3Pipeline.from_pretrained(
                    "stabilityai/stable-diffusion-3.5-medium",
                    quantization_config=nf4_config,
                    torch_dtype=torch.bfloat16,
                    token=token
                )
                
                # 啟用 CPU offload 以節省 VRAM
                pipe.enable_model_cpu_offload()
                
                print(f"[INFO] 成功回退載入 SD 3.5-m 模型")
                return pipe
                
            except Exception as e3:
                print(f"[ERROR] 回退載入失敗: {e3}")
                # 最終嘗試：無量化的基本載入
                return DiffusionPipeline.from_pretrained(
                    "stabilityai/stable-diffusion-3.5-medium",
                    token=token
                ).to("cuda")

# 新增函數：從 GridFS 獲取檔案並保存到臨時目錄
def get_file_from_gridfs(file_name, collection_name, temp_dir=None):
    try:
        if temp_dir is None:
            temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_files")
        
        os.makedirs(temp_dir, exist_ok=True)
        
        print(f"[INFO] 從 GridFS {collection_name} 獲取檔案: {file_name}")
        
        # 連接 MongoDB
        mongo_uri = os.getenv("vtadb", "mongodb://localhost:27017")
        client = MongoClient(mongo_uri)
        db = client.get_database(os.getenv("vtadb", "vtadb"))
        
        # 選擇相應的 GridFS 集合
        fs = gridfs.GridFS(db, collection=collection_name)
        
        # 嘗試通過文件名找到文件
        query = {"filename": file_name}
        if not fs.exists(query):
            # 如果沒找到，嘗試使用 ObjectId (如果提供的是ID)
            try:
                from bson.objectid import ObjectId
                if ObjectId.is_valid(file_name):
                    query = {"_id": ObjectId(file_name)}
                    if not fs.exists(query):
                        print(f"[ERROR] 在 {collection_name} 中找不到檔案 (ID): {file_name}")
                        return None
            except Exception as e:
                print(f"[ERROR] 檔案查詢失敗: {e}")
                return None
        
        # 獲取文件
        grid_file = fs.find_one(query)
        if grid_file is None:
            print(f"[ERROR] 在 {collection_name} 中找不到檔案: {file_name}")
            return None
        
        # 保存到臨時文件
        actual_filename = grid_file.filename
        
        # 使用安全的文件名
        safe_filename = ''.join(c for c in actual_filename if c.isalnum() or c in '._- ')
        
        # 建立臨時文件路徑
        temp_file_path = os.path.join(temp_dir, safe_filename)
        
        # 寫入檔案
        with open(temp_file_path, 'wb') as f:
            f.write(grid_file.read())
        
        print(f"[INFO] 檔案已保存到臨時位置: {temp_file_path}")
        
        # 關閉 MongoDB 連接
        client.close()
        
        return temp_file_path
    except Exception as e:
        print(f"[ERROR] 從 GridFS 獲取檔案失敗: {e}")
        return None

# 修改現有的 main 函數來使用 GridFS
def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "需要 prompt, user_id, chat_id 三个參數"}))
        sys.exit(1)

    prompt, userid, chat_id = sys.argv[1], sys.argv[2], sys.argv[3]
    lora_name = sys.argv[4] if len(sys.argv) > 4 else None
    
    # 添加新參數: 生成圖片數量
    num_images = 1  # 默認生成一張
    if len(sys.argv) > 5:
        try:
            num_images = int(sys.argv[5])
            # 限制最大生成數量，避免資源耗盡
            num_images = min(max(1, num_images), 4)  # SD 3.5 資源需求較大，限制最多4張
        except ValueError:
            print(f"[WARN] 無效的圖片數量參數: {sys.argv[5]}，使用默認值 1")
            num_images = 1
    
    # 新增參數: 指定要使用的模型
    model_arg = sys.argv[6] if len(sys.argv) > 6 else "default"
    
    print(f"[INFO] 將生成 {num_images} 張圖片，指定模型: {model_arg}")
    
    # 檢查模型是否是自定義模型（webui-style-model-name）
    custom_model_path = None
    if model_arg and not model_arg.startswith(("default", "sd35", "sd3-")):
        # 從 GridFS 獲取自定義模型
        custom_model_path = get_file_from_gridfs(model_arg, "models", 
                                              os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_models"))
        if custom_model_path:
            print(f"[INFO] 已從 GridFS 獲取自定義模型: {custom_model_path}")
            model_arg = custom_model_path
        else:
            print(f"[WARN] 找不到自定義模型 {model_arg}，將使用默認模型")
            model_arg = "default"
    
    # 載入 SD 3.5 模型
    pipe = load_model_sd35(model_arg)

    # 2. 如果有指定 LoRA
    if lora_name:
        # 從 GridFS 獲取 LoRA 檔案
        lora_temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_loras")
        weight_file = get_file_from_gridfs(lora_name, "loras", lora_temp_dir)
        
        if not weight_file:
            # 嘗試添加 .safetensors 後綴再次查找
            if not lora_name.endswith('.safetensors'):
                weight_file = get_file_from_gridfs(f"{lora_name}.safetensors", "loras", lora_temp_dir)
        
        if not weight_file:
            print(json.dumps({"error": f"LoRA 文件不存在於 GridFS: {lora_name}"}))
            sys.exit(1)
            
        try:
            # 嘗試載入 LoRA - SD 3.5 專用方法
            success = False
            for method_name, scale in [
                ("sd35_native", 0.75),   # SD 3.5 原生方法
                ("sd35_adjust", 0.75),   # SD 3.5 調整方法
                ("sd35_peft", 0.75),     # SD 3.5 PEFT 方法
                ("webui", 0.6),          # WebUI 格式支援
                ("a1111", 0.6),          # A1111 格式支援
                ("compatibility", 0.5)   # 相容性最低
            ]:
                print(f"[INFO] 嘗試使用 {method_name} 方式載入 SD 3.5 LoRA")
                
                if method_name == "sd35_native":
                    success = apply_lora_weights_sd35(pipe, weight_file, scale)
                elif method_name == "sd35_adjust":
                    success = adjust_lora_for_sd35(pipe, weight_file, scale)
                elif method_name == "sd35_peft":
                    success = load_lora_with_peft_sd35(pipe, weight_file, scale)
                elif method_name == "webui":
                    # 嘗試 WebUI 格式的載入
                    if is_webui_lora(weight_file):
                        success = apply_lora_weights_sd35(pipe, weight_file, scale)
                        print(f"[INFO] 成功使用 WebUI 格式載入 SD 3.5 LoRA")
                        break
                elif method_name == "a1111":
                    # 嘗試 A1111 格式的載入
                    a1111_compatible = False
                    try:
                        # 檢查是否為 A1111 格式的 LoRA
                        state_dict = load_file(weight_file)
                        keys = state_dict.keys()
                        a1111_compatible = any("lora_unet" in k for k in keys) and any("text_encoder" in k for k in keys)
                    except:
                        pass
                    
                    if a1111_compatible:
                        success = apply_lora_weights_sd35(pipe, weight_file, scale)
                        print(f"[INFO] 成功使用 A1111 格式載入 SD 3.5 LoRA")
                        break
                elif method_name == "compatibility":
                    # 最後的嘗試：使用多種方法的組合
                    try:
                        pipe.load_lora_weights(weight_file)
                        success = True
                    except:
                        print(f"[WARN] 相容性模式載入失敗")
                        success = False
                
                if success:
                    print(f"[INFO] 成功使用 {method_name} 方式載入 SD 3.5 LoRA")
                    break
            
            if not success:
                print(json.dumps({"error": "所有 LoRA 載入方法均失敗，將使用原始模型生成"}))
                
        except Exception as e:
            print(json.dumps({"error": f"LoRA 處理過程發生錯誤: {str(e)}"}))
            sys.exit(1)

    # 3. 產圖 - SD 3.5 產生方式可能不同
    try:
        # 生成多張圖片 - SD 3.5 可能需要特殊參數
        images = pipe(
            prompt=prompt,
            num_inference_steps=40,  # SD 3.5 通常步數可以少一些
            guidance_scale=3.0,      # SD 3.5 推薦的 guidance scale 較小
            num_images_per_prompt=num_images
        ).images
        
        # 儲存所有生成圖片的ID
        all_file_ids = []
        
        # 4. 將每張圖片上傳到 MongoDB GridFS
        for i, image in enumerate(images):
            buf = io.BytesIO()
            image.save(buf, format="PNG")
            img_bytes = buf.getvalue()
            
            try:
                mongo_uri = os.getenv("vtadb", "mongodb://localhost:27017")
                client = MongoClient(mongo_uri)
                db = client.get_database(os.getenv("vtadb", "vtadb"))
                gridfs_images = gridfs.GridFS(db, collection="images")
                file_id = gridfs_images.put(
                    img_bytes,
                    filename=f"generated_{i+1}.png",
                    metadata={
                        "userId": userid,
                        "contentType": "image/png",
                        "uploadDate": datetime.datetime.utcnow(),
                        "chat_id": chat_id,
                        "model": model_arg if not custom_model_path else os.path.basename(custom_model_path),
                        "lora": lora_name or "none",
                        "prompt": prompt,
                        "batch_index": i+1,
                        "batch_total": num_images
                    }
                )
                all_file_ids.append(str(file_id))
                
                # 關閉每次上傳後的 MongoDB 連接以節省資源
                client.close()
                
            except Exception as e:
                print(f"[WARN] 第 {i+1} 張圖片上傳到 MongoDB 失敗: {str(e)}")
        
        # 清理臨時檔案
        try:
            # 清理不再需要的臨時文件
            if 'weight_file' in locals() and weight_file and os.path.exists(weight_file):
                os.remove(weight_file)
                print(f"[INFO] 已清理臨時 LoRA 檔案: {weight_file}")
                
            if custom_model_path and os.path.exists(custom_model_path):
                os.remove(custom_model_path)
                print(f"[INFO] 已清理臨時模型檔案: {custom_model_path}")
        except Exception as e:
            print(f"[WARN] 清理臨時檔案失敗: {e}")
        
        # 返回所有生成圖片的ID
        if len(all_file_ids) == 1:
            # 如果只有一張圖片，保持原始輸出格式
            print(json.dumps({"_id": all_file_ids[0]}))
        else:
            # 如果有多張圖片，返回ID列表
            print(json.dumps({"_ids": all_file_ids}))
            
    except Exception as e:
        print(json.dumps({"error": f"SD 3.5 生成圖像失敗: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
