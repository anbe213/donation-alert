import sys
import os
import argparse

# Thiết lập encoding cho stdout để tránh lỗi in tiếng Việt trên CMD
sys.stdout.reconfigure(encoding='utf-8')

def main():
    parser = argparse.ArgumentParser(description="VieNeu-TTS Worker")
    parser.add_argument("--text", type=str, required=True, help="Văn bản cần đọc")
    parser.add_argument("--output", type=str, required=True, help="Đường dẫn file đầu ra (.wav)")
    parser.add_argument("--voice", type=str, default="Phạm Tuyên", help="Tên giọng đọc")
    args = parser.parse_args()

    # Import vieneu
    try:
        from vieneu import Vieneu
    except ImportError:
        print("LỖI: Chưa cài đặt thư viện 'vieneu'. Hãy chạy 'pip install vieneu'.")
        sys.exit(1)
        
    try:
        print(f"Khởi tạo VieNeu-TTS (v3 Turbo)...")
        # Khởi tạo mô hình (CPU mặc định qua ONNX)
        vieneu = Vieneu()
        
        print(f"Đang sinh âm thanh cho: '{args.text}' với giọng: '{args.voice}'")
        audio = vieneu.infer(args.text, voice=args.voice)
        
        # Đảm bảo thư mục đích tồn tại
        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
        
        vieneu.save(audio, args.output)
        print(f"THÀNH CÔNG: Đã lưu file vào {args.output}")
        sys.exit(0)
    except Exception as e:
        print(f"LỖI trong quá trình sinh âm thanh: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
