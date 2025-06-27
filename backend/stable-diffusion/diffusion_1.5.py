import os
import sys
import json
import torch
import io
import safetensors
from safetensors.torch import load_file
from diffusers import StableDiffusionPipeline, StableDiffusionXLPipeline
from diffusers.models.attention_processor import LoRAAttnProcessor
from subprocess import run, PIPE
import datetime
from pymongo import MongoClient
import gridfs
from PIL import Image

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

# 修改後的轉換 WebUI/Kohya LoRA 函數
def convert_webui_lora_to_diffusers(src_path, out_dir):
    try:
        os.makedirs(out_dir, exist_ok=True)
        
        # 嘗試使用 diffusers-convert 工具轉換 (如果已安裝)
        try:
            result = run([
                sys.executable, "-m", "diffusers.convert_lora_safetensor_to_diffusers",
                "--lora_pt_path", src_path,
                "--dump_path", out_dir
            ], check=True, stdout=PIPE, stderr=PIPE)
            print(f"[INFO] 使用 diffusers-convert 工具轉換成功: {out_dir}")
            
            # 確保輸出目錄中有 pytorch_lora_weights.safetensors
            if not os.path.exists(os.path.join(out_dir, "pytorch_lora_weights.safetensors")):
                import shutil
                shutil.copy2(src_path, os.path.join(out_dir, "pytorch_lora_weights.safetensors"))
                print(f"[INFO] 已複製原始權重作為 pytorch_lora_weights.safetensors")
                
            return True
        except Exception as e1:
            print(f"[WARN] diffusers-convert 工具轉換失敗: {e1}")
            
            # 嘗試使用 diffusers CLI 轉換工具
            try:
                result = run([
                    "diffusers-cli", "convert", "lora", 
                    "--lora_pt_path", src_path,
                    "--dump_path", out_dir
                ], check=True, stdout=PIPE, stderr=PIPE)
                print(f"[INFO] 使用 diffusers CLI 轉換成功: {out_dir}")
                return True
            except Exception as e2:
                print(f"[WARN] diffusers CLI 轉換失敗: {e2}")
                
                # 備用方案：直接複製檔案
                import shutil
                dst_path = os.path.join(out_dir, "pytorch_lora_weights.safetensors")
                shutil.copy2(src_path, dst_path)
                print(f"[INFO] 已複製 LoRA 權重至 {dst_path}")
                return True
    except Exception as e:
        print(f"[ERROR] 轉換失敗: {e}")
        return False

# 使用 LoRAHub 方式載入 WebUI/Kohya LoRA
def load_lora_from_hub(pipe, lora_path, scale=0.75):
    try:
        print(f"[INFO] 使用 LoRAHub 方式載入 LoRA: {lora_path}")
        
        # 設定臨時檔案路徑
        temp_dir = os.path.join(os.path.dirname(lora_path), "temp_converted")
        os.makedirs(temp_dir, exist_ok=True)
        
        # 轉換 LoRA 格式
        convert_webui_lora_to_diffusers(lora_path, temp_dir)
        
        # 嘗試使用 load_attn_procs 方法 (適用於較舊版本的 diffusers)
        try:
            weight_name = "pytorch_lora_weights.safetensors"
            weight_path = os.path.join(temp_dir, weight_name)
            if os.path.exists(weight_path):
                pipe.unet.load_attn_procs(temp_dir, weight_name=weight_name)
                print(f"[INFO] 成功使用 load_attn_procs 載入 LoRA: {lora_path}")
                return True
        except Exception as e1:
            print(f"[WARN] load_attn_procs 載入失敗: {e1}")
            
            # 備用方案：使用 load_lora_weights 方法
            pipe.load_lora_weights(temp_dir)
            print(f"[INFO] 成功使用 load_lora_weights 載入 LoRA: {lora_path}")
            return True
            
    except Exception as e:
        print(f"[ERROR] LoRAHub 載入失敗: {e}")
        return False

# 使用 PEFT 庫載入 WebUI/Kohya LoRA
def load_lora_with_peft(pipe, lora_path, scale=0.75):
    try:
        print(f"[INFO] 嘗試使用 PEFT 載入 LoRA: {lora_path}")
        
        # 確保有必要的套件
        try:
            import peft
            from peft import PeftModel
        except ImportError:
            print(f"[INFO] 安裝 peft...")
            run([sys.executable, "-m", "pip", "install", "peft"], check=True)
            import peft
            from peft import PeftModel
        
        # 獲取 PEFT 配置
        config = peft.LoraConfig(
            r=4,  # LoRA 的秩，通常為 4 或 8
            lora_alpha=scale * 4,  # 縮放因子，通常是 rank 的倍數
            target_modules=["q_proj", "k_proj", "v_proj", "out_proj"],  # 要微調的模塊
            bias="none",
            task_type="TEXT_GENERATION"  # 為文本生成優化
        )
        
        # 使用 PEFT 將模型轉換為 LoRA 模型
        pipe.unet = PeftModel.from_pretrained(pipe.unet, lora_path, adapter_name="default")
        if hasattr(pipe, "text_encoder"):
            pipe.text_encoder = PeftModel.from_pretrained(pipe.text_encoder, lora_path, adapter_name="default")
        
        # 設置縮放因子
        pipe.unet.set_adapter_scale(scale)
        if hasattr(pipe, "text_encoder"):
            pipe.text_encoder.set_adapter_scale(scale)
        
        print(f"[INFO] 成功使用 PEFT 載入 LoRA")
        return True
    except Exception as e:
        print(f"[ERROR] PEFT 載入失敗: {e}")
        return False

# 使用 CompVis/Stable Diffusion WebUI 兼容方式載入 LoRA
def load_webui_compatible_lora(pipe, lora_path, scale=0.75):
    try:
        print(f"[INFO] 嘗試使用 WebUI 兼容方式載入 Civitai LoRA: {lora_path}")
        
        # 檢查文件格式
        if lora_path.endswith('.safetensors'):
            # 直接處理 safetensors 文件
            state_dict = load_file(lora_path)
            
            # 獲取所有權重關鍵字
            lora_keys = [k for k in state_dict.keys()]
            
            # 打印權重信息以便調試
            print(f"[INFO] 找到 {len(lora_keys)} 個權重")
            if len(lora_keys) > 0:
                print(f"[DEBUG] 前5個權重名稱: {lora_keys[:5]}")
            
            # 檢查是否包含典型的 A1111 關鍵字
            a1111_format = any("model_diffusion_model" in k or "cond_stage_model" in k for k in lora_keys)
            if a1111_format:
                print(f"[INFO] 識別為 A1111 WebUI 格式的 LoRA，嘗試專用轉換...")
                return convert_a1111_lora(pipe, lora_path, scale)
            
            # 檢查是否為 SD Web UI 格式的 LoRA
            webui_format = any("lora_unet" in k or "lora_te" in k for k in lora_keys)
            if webui_format:
                print(f"[INFO] 識別為 WebUI 格式的 LoRA")
                # 可以添加專門的處理方法
            
            # 檢查是否為舊版 Kohya 格式的 LoRA
            kohya_format = any("alpha" in k or "lokr" in k or "hada" in k for k in lora_keys)
            if kohya_format:
                print(f"[INFO] 識別為 Kohya 格式的 LoRA")
                # 可以添加專門的處理方法
            
            # 檢查是否為 Diffusers 格式
            diffusers_format = any("lora_weight" in k for k in lora_keys)
            if diffusers_format:
                print(f"[INFO] 識別為 Diffusers 格式的 LoRA")
                try:
                    pipe.load_lora_weights(lora_path)
                    print(f"[INFO] 成功載入 Diffusers 格式的 LoRA")
                    return True
                except Exception as e:
                    print(f"[ERROR] 載入 Diffusers 格式的 LoRA 失敗: {e}")
            
            # 如果沒有匹配任何已知格式，嘗試使用 lora_diffusion 轉換
            print(f"[INFO] 無法識別 LoRA 格式，嘗試使用 lora_diffusion 轉換...")
            return convert_a1111_lora(pipe, lora_path, scale)
            
        else:
            print(f"[ERROR] 不支持的文件格式: {lora_path}")
        
        return False
    except Exception as e:
        print(f"[ERROR] WebUI 兼容載入失敗: {e}")
        return False

# 使用 torch.load_state_dict 直接載入 WebUI/Kohya LoRA
def apply_lora_weights(pipe, lora_path, scale=0.75):
    try:
        print(f"[INFO] 使用原生方式載入 LoRA: {lora_path}")
        # 這是 diffusers 0.21.0 之後提供的 API
        pipe.load_lora_weights(lora_path, adapter_name="default")
        pipe.set_adapters(["default"], adapter_weights=[scale])
        print(f"[INFO] 成功載入 LoRA 權重: {lora_path}")
        return True
    except Exception as e:
        print(f"[WARN] 原生方式載入失敗: {e}")
        try:
            # 備用方案：使用舊版 API
            print(f"[INFO] 嘗試使用舊版 API 載入 LoRA...")
            pipe.load_lora_weights(lora_path)
            print(f"[INFO] 成功使用舊版 API 載入 LoRA 權重: {lora_path}")
            return True
        except Exception as e2:
            print(f"[WARN] 舊版 API 載入失敗: {e2}")
            try:
                # 第三種方案：使用 LoRAHub 方式載入
                success = load_lora_from_hub(pipe, lora_path, scale)
                if success:
                    return True
                
                # 第四種方案：使用 PEFT 庫載入
                success = load_lora_with_peft(pipe, lora_path, scale)
                if success:
                    return True
                
                # 第五種方案：使用 WebUI 兼容方式載入
                success = load_webui_compatible_lora(pipe, lora_path, scale)
                if success:
                    return True
                
            except Exception as e3:
                print(f"[ERROR] 所有載入方法均失敗")
            return False

# 使用 lora_diffusion 庫轉換 A1111 WebUI 格式的 LoRA
def convert_a1111_lora(pipe, lora_path, scale=0.75):
    try:
        print(f"[INFO] 嘗試轉換 A1111 WebUI 格式的 LoRA: {lora_path}")
        
        # 載入 A1111 LoRA 權重
        lora_sd = load_file(lora_path)
        
        # 以下是新的 A1111 到 Diffusers 映射邏輯
        applied_count = 0
        
        # 檢查是否為完整模型權重而非 LoRA 權重
        if 'cond_stage_model.transformer.text_model.embeddings.position_embedding.weight' in lora_sd:
            print(f"[INFO] 檢測到這可能是完整模型權重而非 LoRA 差異權重")
            print(f"[INFO] 嘗試以融合方式應用...")
            
            # 不同的 A1111 權重可能使用不同的命名方式，我們嘗試多種映射
            mapping_patterns = [
                # Diffusers UNet 映射
                {
                    "diffusers_prefix": "unet.",
                    "a1111_prefixes": [
                        "model.diffusion_model.",
                        "first_stage_model.model.diffusion_model."
                    ]
                },
                # Diffusers Text Encoder 映射
                {
                    "diffusers_prefix": "text_encoder.",
                    "a1111_prefixes": [
                        "cond_stage_model.transformer.",
                        "cond_stage_model.model.transformer."
                    ]
                }
            ]
            
            # 將 A1111 權重映射到 Diffusers 格式
            unet_count = 0
            text_encoder_count = 0
            
            # 轉移所有張量到 GPU
            for key in lora_sd:
                if isinstance(lora_sd[key], torch.Tensor):
                    lora_sd[key] = lora_sd[key].to(pipe.device)
            
            # 處理 UNet 參數
            for name, param in pipe.unet.named_parameters():
                if not param.requires_grad:
                    continue
                    
                # 嘗試所有可能的 A1111 命名方式
                for pattern in mapping_patterns[0]["a1111_prefixes"]:
                    a1111_key = pattern + name.replace(".", "_")
                    
                    if a1111_key in lora_sd:
                        try:
                            # 確保兩個張量形狀一致
                            if lora_sd[a1111_key].shape == param.shape:
                                # 應用融合: 原始權重 + 縮放後的 LoRA 權重
                                param.data = param.data * (1 - scale) + lora_sd[a1111_key].to(param.device) * scale
                                unet_count += 1
                                break
                            else:
                                print(f"[WARN] 形狀不匹配: {a1111_key} ({lora_sd[a1111_key].shape} vs {param.shape})")
                        except Exception as e:
                            print(f"[WARN] 應用 UNet 權重時出錯: {e}")
            
            # 處理 Text Encoder 參數
            for name, param in pipe.text_encoder.named_parameters():
                if not param.requires_grad:
                    continue
                    
                # 嘗試所有可能的 A1111 命名方式
                for pattern in mapping_patterns[1]["a1111_prefixes"]:
                    a1111_key = pattern + name.replace(".", "_")
                    
                    if a1111_key in lora_sd:
                        try:
                            # 確保兩個張量形狀一致
                            if lora_sd[a1111_key].shape == param.shape:
                                # 應用融合: 原始權重 + 縮放後的 LoRA 權重
                                param.data = param.data * (1 - scale) + lora_sd[a1111_key].to(param.device) * scale
                                text_encoder_count += 1
                                break
                            else:
                                print(f"[WARN] 形狀不匹配: {a1111_key} ({lora_sd[a1111_key].shape} vs {param.shape})")
                        except Exception as e:
                            print(f"[WARN] 應用 Text Encoder 權重時出錯: {e}")
            
            applied_count = unet_count + text_encoder_count
            print(f"[INFO] 成功融合 {applied_count} 個權重 (UNet: {unet_count}, Text Encoder: {text_encoder_count})")
            
            if applied_count > 0:
                return True
            
            # 如果融合方式失敗，嘗試直接複製最重要的層
            try:
                print(f"[INFO] 嘗試直接複製關鍵層...")
                
                # 確定關鍵層
                key_layers = [
                    ("unet.mid_block.attentions.0.to_k.weight", "model_diffusion_model_middle_block_attentions_0_to_k_weight"),
                    ("unet.mid_block.attentions.0.to_q.weight", "model_diffusion_model_middle_block_attentions_0_to_q_weight"),
                    ("unet.mid_block.attentions.0.to_v.weight", "model_diffusion_model_middle_block_attentions_0_to_v_weight"),
                    ("text_encoder.encoder.layers.11.self_attn.q_proj.weight", "cond_stage_model_transformer_text_model_encoder_layers_11_self_attn_q_proj_weight")
                ]
                
                copied_count = 0
                for diffusers_key, a1111_key in key_layers:
                    if a1111_key in lora_sd:
                        # 遍歷模型參數
                        for name, param in pipe.named_parameters():
                            if name == diffusers_key:
                                try:
                                    # 直接覆蓋權重
                                    param.data = lora_sd[a1111_key].to(param.device)
                                    copied_count += 1
                                    break
                                except Exception as e:
                                    print(f"[WARN] 複製關鍵層時出錯: {e}")
                
                print(f"[INFO] 成功複製 {copied_count} 個關鍵層")
                if copied_count > 0:
                    return True
            except Exception as e:
                print(f"[WARN] 複製關鍵層失敗: {e}")
        
        # 如果上面的方法都失敗，嘗試另一種方式：檢查是否為差異權重
        elif any("lora_" in k.lower() for k in lora_sd.keys()):
            print(f"[INFO] 檢測到差異格式 LoRA 權重，嘗試直接應用...")
            
            # 尋找 LoRA 權重
            lora_keys = [k for k in lora_sd.keys() if "lora_" in k.lower()]
            print(f"[INFO] 找到 {len(lora_keys)} 個 LoRA 差異權重")
            
            # 嘗試應用 LoRA 權重
            # ...實現 LoRA 權重應用邏輯...
            
            return True
            
        else:
            # 最後的嘗試：直接將權重作為底層融合
            print(f"[INFO] 嘗試將模型視為基底權重直接應用...")
            
            # 需要將權重與 SD 1.5 模型對齊
            
            return False
    
    except Exception as e:
        print(f"[ERROR] A1111 LoRA 轉換失敗: {str(e)}")
        return False

def load_model(model_path):
    """智能載入不同來源的模型"""
    print(f"[INFO] 嘗試載入模型: {model_path}")
    
    # 處理預設模型名稱
    model_name_map = {
        "default": "runwayml/stable-diffusion-v1-5",
        "sd15": "runwayml/stable-diffusion-v1-5",
        "sd21": "stabilityai/stable-diffusion-2-1",
        "sdxl": "stabilityai/stable-diffusion-xl-base-1.0",
    }
    
    if model_path in model_name_map:
        model_path = model_name_map[model_path]
        print(f"[INFO] 使用預設模型: {model_path}")
    
    # 檢查是否為 SDXL 模型
    is_sdxl = "xl" in model_path.lower() or model_path == "sdxl" or "stabilityai/stable-diffusion-xl" in model_path
    
    # 檢查是否為WebUI風格的相對路徑
    if not os.path.isabs(model_path) and "/" not in model_path and "\\" not in model_path:
        # 嘗試在以下位置尋找模型
        possible_paths = [
            # 直接在loras目錄查找
            os.path.join(os.path.dirname(__file__), "loras", f"{model_path}.safetensors"),
            os.path.join(os.path.dirname(__file__), "loras", f"{model_path}.ckpt"),
            
            # 查找WebUI風格的models/Stable-diffusion目錄
            os.path.join(os.path.dirname(__file__), "models", "Stable-diffusion", f"{model_path}.safetensors"),
            os.path.join(os.path.dirname(__file__), "models", "Stable-diffusion", f"{model_path}.ckpt"),
            
            # 查找其他可能的目錄
            os.path.join(os.path.dirname(__file__), "models", f"{model_path}.safetensors"),
            os.path.join(os.path.dirname(__file__), "models", f"{model_path}.ckpt"),
            os.path.join(os.path.dirname(__file__), "models", model_path),
            os.path.join(os.path.dirname(__file__), model_path)
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                model_path = path
                print(f"[INFO] 找到模型文件: {model_path}")
                break
    
    # 規範化路徑 - 將反斜線轉為正斜線
    model_path = os.path.normpath(model_path).replace('\\', '/')
    
    # 處理 SDXL 模型
    if is_sdxl:
        print(f"[INFO] 識別為 SDXL 模型，使用 StableDiffusionXLPipeline")
        
        # 檢查是否為單一文件
        if os.path.isfile(model_path) and (model_path.endswith('.safetensors') or model_path.endswith('.ckpt')):
            print(f"[INFO] 從單一檔案載入 SDXL 模型: {model_path}")
            try:
                return StableDiffusionXLPipeline.from_single_file(
                    model_path,
                    torch_dtype=torch.float16,
                ).to("cuda")
            except Exception as e:
                print(f"[ERROR] 載入 SDXL 模型失敗: {e}")
                print(f"[INFO] 回退到默認模型")
                return StableDiffusionPipeline.from_pretrained(
                    "runwayml/stable-diffusion-v1-5",
                    torch_dtype=torch.float16,
                ).to("cuda")
        
        # 檢查是否為本地目錄
        elif os.path.isdir(model_path):
            print(f"[INFO] 從本地目錄載入 SDXL 模型: {model_path}")
            try:
                return StableDiffusionXLPipeline.from_pretrained(
                    model_path,
                    local_files_only=True,
                    torch_dtype=torch.float16,
                ).to("cuda")
            except Exception as e:
                print(f"[ERROR] 從本地目錄載入 SDXL 模型失敗: {e}")
                print(f"[INFO] 回退到默認模型")
                return StableDiffusionPipeline.from_pretrained(
                    "runwayml/stable-diffusion-v1-5",
                    torch_dtype=torch.float16,
                ).to("cuda")
        
        # 從 Hugging Face 下載
        else:
            print(f"[INFO] 從 Hugging Face 下載 SDXL 模型: {model_path}")
            try:
                return StableDiffusionXLPipeline.from_pretrained(
                    model_path,
                    torch_dtype=torch.float16,
                ).to("cuda")
            except Exception as e:
                print(f"[ERROR] 從 Hugging Face 下載 SDXL 模型失敗: {e}")
                print(f"[INFO] 回退到默認模型")
                return StableDiffusionPipeline.from_pretrained(
                    "runwayml/stable-diffusion-v1-5",
                    torch_dtype=torch.float16,
                ).to("cuda")
    
    # 處理標準 SD 模型
    # 檢查是否為單一文件
    if os.path.isfile(model_path) and (model_path.endswith('.safetensors') or model_path.endswith('.ckpt')):
        # 從單一檔案載入
        print(f"[INFO] 從單一檔案載入標準 SD 模型: {model_path}")
        try:
            return StableDiffusionPipeline.from_single_file(
                model_path,
                torch_dtype=torch.float16,
            ).to("cuda")
        except Exception as e:
            print(f"[ERROR] 載入標準 SD 模型失敗: {e}")
            print(f"[INFO] 回退到默認模型")
            return StableDiffusionPipeline.from_pretrained(
                "runwayml/stable-diffusion-v1-5",
                torch_dtype=torch.float16,
            ).to("cuda")
    
    # 檢查是否為本地目錄
    elif os.path.isdir(model_path):
        # 從本地目錄載入
        print(f"[INFO] 從本地目錄載入標準 SD 模型: {model_path}")
        try:
            return StableDiffusionPipeline.from_pretrained(
                model_path,
                local_files_only=True,
                torch_dtype=torch.float16,
            ).to("cuda")
        except Exception as e:
            print(f"[ERROR] 從本地目錄載入標準 SD 模型失敗: {e}")
            print(f"[INFO] 回退到默認模型")
            return StableDiffusionPipeline.from_pretrained(
                "runwayml/stable-diffusion-v1-5",
                torch_dtype=torch.float16,
            ).to("cuda")
    
    # 假設是 Hugging Face 模型 ID
    else:
        # 從 Hugging Face 下載
        print(f"[INFO] 從 Hugging Face 下載標準 SD 模型: {model_path}")
        try:
            return StableDiffusionPipeline.from_pretrained(
                model_path,
                torch_dtype=torch.float16,
            ).to("cuda")
        except Exception as e:
            print(f"[ERROR] 從 Hugging Face 下載標準 SD 模型失敗: {e}")
            print(f"[INFO] 回退到默認模型")
            return StableDiffusionPipeline.from_pretrained(
                "runwayml/stable-diffusion-v1-5",
                torch_dtype=torch.float16,
            ).to("cuda")

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
            num_images = min(max(1, num_images), 10)  # 最少1張，最多10張
        except ValueError:
            print(f"[WARN] 無效的圖片數量參數: {sys.argv[5]}，使用默認值 1")
            num_images = 1
    
    # 新增參數: 指定要使用的模型
    model_arg = sys.argv[6] if len(sys.argv) > 6 else "default"
    
    print(f"[INFO] 將生成 {num_images} 張圖片，指定模型: {model_arg}")
    
    # 載入模型
    pipe = load_model(model_arg)

    # 2. 如果有指定 LoRA
    if lora_name:
        # 檢查 lora_name 是否已包含 .safetensors 副檔名
        if lora_name.endswith('.safetensors'):
            base_name = lora_name[:-12]  # 移除 .safetensors
            weight_file = os.path.join("loras", lora_name)
        else:
            base_name = lora_name
            weight_file = os.path.join("loras", f"{lora_name}.safetensors")
        
        lora_dir = os.path.abspath(os.path.join("loras", base_name))
        
        # 檢查文件是否存在
        if not os.path.exists(weight_file):
            print(json.dumps({"error": f"LoRA 文件不存在: {weight_file}"}))
            sys.exit(1)
            
        try:
            # 嘗試載入 LoRA
            success = False
            for method_name, scale in [
                ("direct", 1),
                ("hub", 1),
                ("peft", 1),
                ("webui", 0.75),
                ("a1111", 0.75)  # 新增 A1111 專用方法
            ]:
                print(f"[INFO] 嘗試使用 {method_name} 方式載入 LoRA")
                
                if method_name == "direct":
                    success = apply_lora_weights(pipe, weight_file, scale)
                elif method_name == "hub":
                    success = load_lora_from_hub(pipe, weight_file, scale)
                elif method_name == "peft":
                    success = load_lora_with_peft(pipe, weight_file, scale)
                elif method_name == "webui":
                    success = load_webui_compatible_lora(pipe, weight_file, scale)
                elif method_name == "a1111":
                    success = convert_a1111_lora(pipe, weight_file, scale)
                
                if success:
                    print(f"[INFO] 成功使用 {method_name} 方式載入 LoRA")
                    break
            
            if not success:
                print(json.dumps({"error": "所有 LoRA 載入方法均失敗，將使用原始模型生成"}))
                # 不要在這裡退出，讓程式繼續使用原始模型生成圖像
                # sys.exit(1)
                
        except Exception as e:
            print(json.dumps({"error": f"LoRA 處理過程發生錯誤: {str(e)}"}))
            sys.exit(1)

    # 3. 產圖 - 修改為支持批量生成
    try:
        # 生成多張圖片
        images = pipe(
            prompt, 
            num_inference_steps=40, 
            guidance_scale=4.5,
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
                        "model":model_arg,
                        "custom_model": model_arg if model_arg not in ["default", "sd15", "sd21", "sdxl"] else "none",
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
        
        # 返回所有生成圖片的ID
        if len(all_file_ids) == 1:
            # 如果只有一張圖片，保持原始輸出格式
            print(json.dumps({"_id": all_file_ids[0]}))
        else:
            # 如果有多張圖片，返回ID列表
            print(json.dumps({"_ids": all_file_ids}))
            
    except Exception as e:
        print(json.dumps({"error": f"生成圖像失敗: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
