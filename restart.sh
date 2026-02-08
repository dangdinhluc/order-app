#!/bin/bash

# Hybrid POS Restart Script
echo "🔄 Đang dừng các service cũ..."

# Tìm và kill các tiến trình đang chạy trên cổng 3001, 5173, 5174
PORTS=(3001 5173 5174)

for port in "${PORTS[@]}"
do
    pid=$(lsof -t -i :$port)
    if [ -n "$pid" ]; then
        echo "📍 Đang giải phóng cổng $port (PID: $pid)..."
        kill -9 $pid
    fi
done

echo "✅ Đã dọn dẹp xong. Đang khởi động lại app..."
echo "---"

# Chạy pnpm dev
pnpm dev
