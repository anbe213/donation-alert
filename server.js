require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const ngrok = require('@ngrok/ngrok');

const webhookController = require('./controllers/webhookController');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

const PORT = process.env.PORT || 3000;

// Middleware lưu lại raw body để verify signature
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Gán io vào req để controller có thể gọi
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Thêm bộ ghi log để debug mọi request bay tới máy chủ
app.use((req, res, next) => {
    console.log(`[Network] Có request bay tới: ${req.method} ${req.url}`);
    next();
});

// Phục vụ file tĩnh cho Frontend
app.use(express.static(path.join(__dirname, 'public')));

// Định tuyến API Webhook
app.post('/api/apibank/webhook', webhookController.handleWebhook);

// Socket.io kết nối
io.on('connection', (socket) => {
    console.log('[Socket] Một client OBS (Frontend) vừa kết nối.');
    
    // Gửi trạng thái Goal khi có client yêu cầu
    socket.on('request_goal_init', () => {
        try {
            const fs = require('fs');
            const goalPath = path.join(__dirname, 'public/goal/goal.json');
            if (fs.existsSync(goalPath)) {
                const goalData = JSON.parse(fs.readFileSync(goalPath, 'utf8'));
                socket.emit('update_goal', goalData);
            }
        } catch (e) {
            console.error('[Socket] Lỗi đọc goal.json:', e.message);
        }
    });

    // Gửi trạng thái Countdown khi có client yêu cầu
    socket.on('request_countdown_init', () => {
        try {
            const fs = require('fs');
            const cdPath = path.join(__dirname, 'public/countdown/countdown.json');
            if (fs.existsSync(cdPath)) {
                let cdData = JSON.parse(fs.readFileSync(cdPath, 'utf8'));
                if (!cdData.real_start_time || cdData.real_start_time.trim() === "") {
                    cdData.real_start_time = new Date().toISOString();
                    fs.writeFileSync(cdPath, JSON.stringify(cdData, null, 2), 'utf8');
                }
                socket.emit('update_countdown', cdData);
            }
        } catch (e) {
            console.error('[Socket] Lỗi đọc countdown.json:', e.message);
        }
    });

    socket.on('disconnect', () => {
        console.log('[Socket] Client OBS đã ngắt kết nối.');
    });
});

// --- Khởi tạo và Tick tự động cho Subathon Countdown ---
try {
    const fs = require('fs');
    const cdPath = path.join(__dirname, 'public/countdown/countdown.json');
    if (fs.existsSync(cdPath)) {
        let cdData = JSON.parse(fs.readFileSync(cdPath, 'utf8'));
        // Khi server khởi động, mốc tính thời gian (real_start_time) được làm mới thành lúc này,
        // để thời gian trong lúc server tắt (đi ngủ) không bị cộng vào.
        cdData.real_start_time = new Date().toISOString();
        fs.writeFileSync(cdPath, JSON.stringify(cdData, null, 2), 'utf8');
    }
    
    const parseTime = (str) => {
        const parts = (str || "00:00:00").split(':').map(Number);
        return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    };
    const formatTime = (totalSec) => {
        let h = Math.floor(totalSec / 3600);
        let m = Math.floor((totalSec % 3600) / 60);
        let s = Math.floor(totalSec % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Vòng lặp tick mỗi 60 giây (Lưu tiến độ vào ổ cứng)
    setInterval(() => {
        try {
            if (fs.existsSync(cdPath)) {
                let cdData = JSON.parse(fs.readFileSync(cdPath, 'utf8'));
                if (cdData.real_start_time) {
                    let startSec = parseTime(cdData.start);
                    let realStart = new Date(cdData.real_start_time).getTime();
                    let now = Date.now();
                    let elapsed = Math.floor((now - realStart) / 1000);
                    
                    if (elapsed >= 60) {
                        let newStartSec = startSec + elapsed;
                        cdData.start = formatTime(newStartSec);
                        cdData.real_start_time = new Date(now).toISOString();
                        fs.writeFileSync(cdPath, JSON.stringify(cdData, null, 2), 'utf8');
                        io.emit('update_countdown', cdData); // Gửi bản cập nhật cho client
                    }
                }
            }
        } catch(e) {}
    }, 60000); // 1 phút / lần
} catch (e) {
    console.error('[Countdown Init Error]:', e.message);
}

// Khởi chạy Server
server.listen(PORT, async () => {
    console.log(`\n===========================================`);
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`🔗 Cài vào OBS Browser Source: http://localhost:${PORT}/alert/index.html`);
    console.log(`===========================================\n`);

    // Kiểm tra kết nối Groq API
    try {
        const fs = require('fs');
        const configPath = path.join(__dirname, 'public/alert/config.json');
        if (fs.existsSync(configPath)) {
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (configData.enable_ai_parsing) {
                console.log('🤖 Đang kiểm tra kết nối Groq API (AI Parsing)...');
                const groqKey = process.env.GROQ_API_KEY;
                const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
                
                if (!groqKey || groqKey.includes('your_groq_api_key') || groqKey.trim() === '') {
                    console.log('⚠️  CẢNH BÁO: Bạn đã bật AI Parsing nhưng chưa cấu hình GROQ_API_KEY trong file .env');
                    console.log('⚠️  Hệ thống sẽ tự động chuyển về chế độ Regex truyền thống.');
                } else {
                    const response = await fetch('https://api.groq.com/openai/v1/models', {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${groqKey}` }
                    });
                    if (response.ok) {
                        console.log(`✅ GROQ API KẾT NỐI THÀNH CÔNG! (Model sẵn sàng: ${groqModel})`);
                    } else {
                        console.log(`❌ LỖI KẾT NỐI GROQ API: Bị từ chối (Mã lỗi HTTP ${response.status}). Vui lòng kiểm tra lại API Key.`);
                    }
                }
            } else {
                console.log('ℹ️  Tính năng AI Parsing đang tắt (Sử dụng cắt chữ Regex truyền thống).');
            }
        }
    } catch (e) {
        console.error('❌ Lỗi khi kiểm tra AI config:', e.message);
    }
    console.log('');

    // Tự động thiết lập đường hầm Ngrok
    try {
        console.log('Đang khởi tạo đường hầm Ngrok...');
        
        const ngrokOptions = {
            port: PORT,
            authtoken: process.env.NGROK_AUTHTOKEN || undefined
        };

        if (process.env.NGROK_DOMAIN) {
             ngrokOptions.domain = process.env.NGROK_DOMAIN;
        }

        const listener = await ngrok.connect(ngrokOptions);
        
        console.log(`\n===========================================`);
        console.log(`✅ NGROK ĐÃ KẾT NỐI THÀNH CÔNG!`);
        console.log(`👉 Link Webhook của bạn là: ${listener.url()}/api/apibank/webhook`);
        console.log(`👉 Hãy copy link này và dán vào phần quản lý Webhook của APIBank.`);
        console.log(`===========================================\n`);
    } catch (error) {
        console.error('❌ Lỗi khi khởi tạo Ngrok:', error.message);
        console.error('Hãy kiểm tra lại xem NGROK_AUTHTOKEN có đúng không, hoặc Ngrok có đang chạy ở đâu đó không.');
    }
});

// Đóng ngrok khi thoát app
process.on('SIGINT', async () => {
    console.log("Đang đóng server...");
    await ngrok.disconnect();
    process.exit(0);
});
