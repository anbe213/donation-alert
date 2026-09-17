const crypto = require('crypto');
const db = require('../db/database');

// Hàm kiểm tra chữ ký webhook của APIBank
const verifyWebhookSignature = (secret, timestamp, rawBody, signature) => {
    if (!secret || !timestamp || !rawBody || !signature) return false;
    
    // Payload theo chuẩn APIBank: timestamp + "." + raw_body
    const payload = `${timestamp}.${rawBody}`;
    
    // Tính HMAC-SHA256 dưới dạng hex
    const hmac = crypto.createHmac('sha256', secret);
    const expectedSignature = hmac.update(payload).digest('hex');
    
    return expectedSignature === signature;
};

// Hàm xử lý chính
const handleWebhook = async (req, res) => {
    // 1. Phản hồi HTTP 200 ngay lập tức (dưới 12s theo yêu cầu) 
    // Chúng ta lưu xử lý vào một async task ngầm nhưng trên thực tế Express response.send() sẽ trả về.
    // Tuy nhiên, tốt nhất là kiểm tra qua các điều kiện cơ bản rồi mới trả 200.
    
    try {
        const timestamp = req.headers['x-apibank-timestamp'];
        const signature = req.headers['x-apibank-signature'];
        const eventId = req.headers['x-apibank-event-id'];
        
        // 2. Xác minh Timestamp (không lệch quá 300 giây = 5 phút)
        if (!timestamp) {
            console.log(`[Webhook] Từ chối request vì thiếu header x-apibank-timestamp.`);
            return res.status(400).send('Missing timestamp');
        }
        
        const currentTime = Math.floor(Date.now() / 1000);
        if (Math.abs(currentTime - parseInt(timestamp, 10)) > 300) {
            console.log(`[Webhook] Từ chối request vì timestamp quá hạn.`);
            return res.status(400).send('Timestamp expired');
        }

        // 3. Xác minh Chữ ký (Signature)
        // rawBody được lấy từ middleware express.raw() ở server.js
        const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';
        const secret = process.env.WEBHOOK_SECRET;

        if (!secret) {
            console.error('[Webhook] LỖI: Chưa cấu hình WEBHOOK_SECRET trong file .env');
            return res.status(500).send('Server configuration error');
        }

        if (!verifyWebhookSignature(secret, timestamp, rawBody, signature)) {
            console.log(`[Webhook] Chữ ký không hợp lệ! Có thể là request giả mạo.`);
            return res.status(401).send('Invalid signature');
        }

        // 4. Parse JSON
        const data = JSON.parse(rawBody);
        
        const fs = require('fs');
        const path = require('path');
        let enableAiParsing = false;
        let groqApiKey = process.env.GROQ_API_KEY || '';
        let showLog = true;
        let ttsViTemplate = "{name} đã ném vào mặt bạn {amount} đồng với lời nhắn {message}";
        let ttsEnTemplate = "{name} sent you {amount} with message {message}";
        let enableVieneu = true;
        let vieneuVoice = "Ngọc Trân";
        let rainDensity = 1;
        let rainTiers = { tier1_min: 0, tier2_min: 20000, tier3_min: 50000, tier4_min: 100000 };
        
        try {
            const configPath = path.join(__dirname, '../public/alert/config.json');
            const fileContent = fs.readFileSync(configPath, 'utf8');
            const configData = JSON.parse(fileContent);
            
            if (configData.showLog !== undefined) showLog = configData.showLog;
            if (configData.tts_vietnamese) ttsViTemplate = configData.tts_vietnamese;
            if (configData.tts_english) ttsEnTemplate = configData.tts_english;
            if (configData.enable_vieneu_tts !== undefined) enableVieneu = configData.enable_vieneu_tts;
            if (configData.vieneu_voice) vieneuVoice = configData.vieneu_voice;
            if (configData.rain_density !== undefined) rainDensity = configData.rain_density;
            if (configData.rain_tiers) rainTiers = configData.rain_tiers;
            
            // Cấu hình AI
            if (configData.enable_ai_parsing !== undefined) enableAiParsing = configData.enable_ai_parsing;
            
        } catch (e) {
            console.error('[Webhook] Không thể đọc file config.json, dùng mặc định.');
        }

        // In ra toàn bộ dữ liệu để "bắt bệnh" nếu showLog được bật
        if (showLog) {
            const logStr = JSON.stringify(data, null, 2);
            console.log(`[Webhook] (DEBUG) Payload giải mã thành công:\n`, logStr);
            
            // Lưu ra file log để nghiên cứu
            try {
                const logFilePath = path.join(__dirname, '../payloads.log');
                const logEntry = `\n\n--- [${new Date().toISOString()}] ---\n${logStr}`;
                fs.appendFileSync(logFilePath, logEntry, 'utf8');
            } catch (err) {
                console.error('[Webhook] Không thể ghi file log payloads.log:', err.message);
            }
        }
        
        // 5. Chống trùng lặp (Idempotency) bằng event_id
        const currentEventId = eventId || data.event_id;
        if (!currentEventId) {
             console.log(`[Webhook] Từ chối request vì thiếu event_id.`);
             return res.status(400).send('Missing event_id');
        }

        const isProcessed = await db.hasEventBeenProcessed(currentEventId);
        if (isProcessed) {
            console.log(`[Webhook] Event ID ${currentEventId} đã được xử lý trước đó. Bỏ qua.`);
            return res.status(200).send('Already processed');
        }

        // 6. Đánh dấu đã xử lý và lưu data
        await db.markEventAsProcessed(currentEventId);
        
        // Lấy đúng dữ liệu giao dịch từ cấu trúc của APIBank (data.data.transaction)
        const tx = (data.data && data.data.transaction) ? data.data.transaction : data;

        // --- Bỏ qua giao dịch TEST từ APIBank ---
        const rawDescTest = (tx.description || tx.content || '').toLowerCase();
        if (rawDescTest.includes('test webhook') || rawDescTest.includes('giao dịch thử nghiệm') || rawDescTest === 'test' || (tx.amount === 50000 && rawDescTest.includes('test'))) {
            console.log(`[Webhook] => Đã bỏ qua giao dịch TEST từ hệ thống APIBank (Không cộng vào Goal).`);
            return res.status(200).send('Success (Test Ignored)');
        }

        // --- HÀM 1: Dọn dẹp nội dung bằng Regex (Fallback truyền thống) ---
        const extractMessageAndSenderFallback = (desc) => {
            let result = { message: 'Không có lời nhắn', senderName: 'Người xem ẩn danh' };
            if (!desc) return result;
            
            // Tìm tên người gửi
            const threeWordsMatch = desc.match(/\b([A-Z]+(?:\s+[A-Z]+){2,5})\b/);
            const twoWordsMatch = desc.match(/\b([A-Z]+(?:\s+[A-Z]+){1})\b/);
            
            if (threeWordsMatch) {
                result.senderName = threeWordsMatch[1].trim();
            } else if (twoWordsMatch) {
                let name = twoWordsMatch[1].trim();
                if (!name.startsWith('CT ')) {
                    result.senderName = name;
                }
            }

            // Lọc tin nhắn
            const parts = desc.split('.');
            let validMsgParts = [];

            for (let i = 0; i < parts.length; i++) {
                const p = parts[i].trim();
                if (!p) continue;
                if (i === 0) continue;
                if (/^\d+$/.test(p)) continue;
                if (!p.includes(' ') && p.length > 8) continue;

                const pLower = p.toLowerCase();
                if (pLower.includes('ct tu') || pLower.includes('chuyen tien tu') || pLower.includes('nhan tu')) {
                    continue;
                }
                validMsgParts.push(p);
            }

            if (validMsgParts.length > 0) {
                result.message = validMsgParts.join('. ').trim();
            }

            return result;
        };

        // --- HÀM 2: Dọn dẹp nội dung bằng AI (Groq API) kết hợp Fallback ---
        const extractMessageAndSenderAI = async (desc) => {
            if (!desc) return { message: 'Không có lời nhắn', senderName: 'Người xem ẩn danh' };

            if (enableAiParsing && groqApiKey && groqApiKey !== "YOUR_GROQ_API_KEY_HERE") {
                try {
                    console.log("[AI Parsing] Đang gửi yêu cầu lên Groq API (Llama 3.1 70B)...");
                    const prompt = `Bạn là một trợ lý ảo chuyên trích xuất dữ liệu giao dịch ngân hàng.
Nhiệm vụ của bạn: Đọc chuỗi 'description' từ ngân hàng, trích xuất 'Tên người gửi' và 'Nội dung chuyển khoản'.
Bạn phải khôi phục dấu tiếng Việt cho tên và nội dung sao cho hợp lý nhất theo ngữ cảnh. Loại bỏ tất cả các mã giao dịch, số điện thoại, chữ rác của hệ thống (như 'NHAN TU', 'TRACE', 'ND', 'qua MoMo', 'FT...'). Lưu ý, phía sau 'ND' thường ngay lập tức sẽ là nội dung chuyển khoản, tuy nhiên nội dung chuyển khoản sẽ không kéo dài đến hết chuỗi mà sẽ dừng lại ở giữa rồi ngay sau đó sẽ tiếp tục là chữ rác của hệ thống. Nếu nội dung chỉ chứa tên người gửi và mã rác, hãy để nội dung là rỗng.
CHỈ trả về định dạng JSON duy nhất, không giải thích gì thêm:
{ "sender_name": "Tên Đã Có Dấu", "message": "Nội dung đã có dấu" }

Description: "${desc}"`;

                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${groqApiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
                            messages: [{ role: 'user', content: prompt }],
                            temperature: 0.1
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Groq API error! status: ${response.status}`);
                    }
                    
                    const responseData = await response.json();
                    let rawContent = responseData.choices[0].message.content;
                    // Dọn dẹp markdown code block nếu AI tự bọc vào
                    rawContent = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
                    
                    const aiResult = JSON.parse(rawContent);
                    console.log("[AI Parsing] Thành công:", aiResult);
                    
                    // Xử lý logic nếu AI trả rỗng thì dùng fallback text mặc định
                    let finalName = aiResult.sender_name && aiResult.sender_name.trim() !== "" ? aiResult.sender_name : 'Người xem ẩn danh';
                    let finalMsg = aiResult.message && aiResult.message.trim() !== "" ? aiResult.message : 'Không có lời nhắn';
                    
                    return { senderName: finalName, message: finalMsg };
                    
                } catch (e) {
                    console.error("[AI Parsing] Lỗi khi gọi Groq API, tự động Fallback về Regex truyền thống:", e.message);
                    return extractMessageAndSenderFallback(desc);
                }
            } else {
                return extractMessageAndSenderFallback(desc);
            }
        };

        const extractedData = await extractMessageAndSenderAI(tx.description || tx.content);

        const donationInfo = {
            event_id: currentEventId,
            bank_code: tx.bank_code || 'APIBANK',
            account_no: extractedData.senderName, // Gán tên người gửi vào đây để hiển thị lên màn hình
            amount: parseInt(tx.amount) || parseInt(tx.signed_amount) || 0,
            description: extractedData.message,
            transaction_date: tx.happened_at || new Date().toISOString()
        };

        const nameStr = donationInfo.account_no;
        // Gửi số nguyên gốc (không phẩy/chấm) để AI tự động hiểu và đọc đúng hàng trăm, ngàn, triệu
        const amountStrVi = donationInfo.amount.toString();
        const amountStrEn = donationInfo.amount.toString();
        
        // Loại bỏ các thẻ trong ngoặc vuông (như [cười khẩy], [thở dài]) để bot không tự diễn
        const msgStr = (donationInfo.description || "").replace(/\[.*?\]/g, '').trim();

        // 1. Mẫu câu ngắn gọn: Cắt bỏ phần "với lời nhắn {message}" ở đằng sau
        const textWithoutMsg = ttsViTemplate
            .replace(/\s*(với\s*lời\s*nhắn|với\s*nội\s*dung)?\s*\{message\}/gi, '')
            .replace('{name}', nameStr)
            .replace('{amount}', amountStrVi)
            .trim();

        // 2. Mẫu câu đầy đủ có kèm lời nhắn
        const textWithMsg = ttsViTemplate
            .replace('{name}', nameStr)
            .replace('{amount}', amountStrVi)
            .replace('{message}', msgStr);

        const hasValidMessage = Boolean(msgStr && msgStr !== 'Không có lời nhắn' && msgStr.trim() !== '');
        const primaryText = hasValidMessage ? textWithMsg : textWithoutMsg;
        const safePrimaryText = primaryText.replace(/["\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
        
        // --- Dọn dẹp các file âm thanh cũ (rác) ---
        const assetsDir = path.join(__dirname, '../public/alert/assets');
        try {
            fs.readdirSync(assetsDir).forEach(file => {
                if (file.startsWith('tts_') && file.endsWith('.wav')) {
                    const filePath = path.join(assetsDir, file);
                    const stats = fs.statSync(filePath);
                    const now = Date.now();
                    // Nếu file đã tồn tại quá 3 phút (thừa thời gian để phát trên OBS) thì xoá luôn
                    if (now - stats.mtimeMs > 3 * 60 * 1000) {
                        fs.unlinkSync(filePath);
                    }
                }
            });
        } catch (e) {
            console.error('[Cleanup] Lỗi dọn dẹp file cũ:', e.message);
        }
        
        // Tính toán item rơi dựa vào số tiền
        let rainItem = 1;
        if (donationInfo.amount >= rainTiers.tier4_min) rainItem = 4;
        else if (donationInfo.amount >= rainTiers.tier3_min) rainItem = 3;
        else if (donationInfo.amount >= rainTiers.tier2_min) rainItem = 2;
        donationInfo.rain_item = rainItem;
        donationInfo.rain_density = rainDensity;

        // --- Tích hợp AI Text-To-Speech (VieNeu-TTS) ---
        // Luôn luôn dùng giọng VieNeu-TTS nội bộ của project
        if (enableVieneu && donationInfo.amount > 0) {
            try {
                const { spawnSync } = require('child_process');
                const fileName = `tts_${Date.now()}.wav`;
                const outputFilePath = path.join(__dirname, '../public/alert/assets', fileName);
                
                console.log(`[VieNeu-TTS] Đang gọi Python sinh giọng đọc offline: "${safePrimaryText}" (Giọng: ${vieneuVoice})`);

                let pyResult = spawnSync('python', [
                    'tts_worker.py',
                    '--text', safePrimaryText,
                    '--output', outputFilePath,
                    '--voice', vieneuVoice
                ], {
                    cwd: path.join(__dirname, '..'), // Chạy ở thư mục gốc project
                    encoding: 'utf8',
                    timeout: 25000 // Giới hạn tối đa 25s
                });

                // Nếu sinh giọng có kèm lời nhắn bị lỗi (do ký tự lạ, lỗi suy luận mô hình...),
                // tự động chuyển sang đọc mẫu câu chuẩn bỏ lời nhắn: "{name} đã ném vào mặt bạn {amount} đồng"
                if ((pyResult.status !== 0 || !fs.existsSync(outputFilePath)) && hasValidMessage) {
                    const safeFallbackText = textWithoutMsg.replace(/["\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
                    console.warn(`[VieNeu-TTS] Lỗi khi sinh giọng có lời nhắn. Tự động thử lại bằng VieNeu với mẫu câu bỏ lời nhắn: "${safeFallbackText}"`);

                    pyResult = spawnSync('python', [
                        'tts_worker.py',
                        '--text', safeFallbackText,
                        '--output', outputFilePath,
                        '--voice', vieneuVoice
                    ], {
                        cwd: path.join(__dirname, '..'),
                        encoding: 'utf8',
                        timeout: 20000
                    });
                }
                
                if (pyResult.status === 0 && fs.existsSync(outputFilePath)) {
                    console.log(`[VieNeu-TTS] Tạo thành công! File: ${fileName}`);
                    donationInfo.local_tts_url = `assets/${fileName}`;
                } else {
                    console.error(`[VieNeu-TTS] Không thể sinh âm thanh VieNeu (mã lỗi ${pyResult.status}):`, pyResult.stderr || pyResult.stdout || pyResult.error?.message);
                }
            } catch (err) {
                console.error('[VieNeu-TTS] Ngoại lệ khi gọi sinh giọng đọc:', err.message);
            }
        }

        console.log(`[Webhook] Phân tích số tiền: ${donationInfo.amount}đ, Tin nhắn: "${donationInfo.description}"`);

        if (donationInfo.amount > 0) {
            await db.saveDonation(donationInfo);
            req.io.emit('new_donation', donationInfo);
            console.log(`[Webhook] => NHẬN DONATE THÀNH CÔNG: ${donationInfo.amount}đ`);

            // --- Cập nhật Donation Goal ---
            try {
                const goalPath = path.join(__dirname, '../public/goal/goal.json');
                if (fs.existsSync(goalPath)) {
                    let goalData = JSON.parse(fs.readFileSync(goalPath, 'utf8'));
                    goalData.current += donationInfo.amount;
                    fs.writeFileSync(goalPath, JSON.stringify(goalData, null, 2), 'utf8');
                    // Báo cho giao diện Goal cập nhật
                    req.io.emit('update_goal', goalData);
                }
            } catch (err) {
                console.error('[Webhook] Lỗi cập nhật goal.json:', err.message);
            }
            
            // --- Cập nhật Subathon Countdown ---
            try {
                const cdPath = path.join(__dirname, '../public/countdown/countdown.json');
                if (fs.existsSync(cdPath)) {
                    let cdData = JSON.parse(fs.readFileSync(cdPath, 'utf8'));
                    
                    let incrementPerHundred = parseFloat(cdData.incrementPerHundred) || 0;
                    if (incrementPerHundred > 0 && donationInfo.amount > 0) {
                        
                        // Parse time "HH:MM:SS" -> seconds
                        const parseTime = (str) => {
                            const parts = (str || "00:00:00").split(':').map(Number);
                            return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
                        };
                        // Format seconds -> "HH:MM:SS"
                        const formatTime = (totalSec) => {
                            let h = Math.floor(totalSec / 3600);
                            let m = Math.floor((totalSec % 3600) / 60);
                            let s = Math.floor(totalSec % 60);
                            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                        };
                        
                        let addedMinutes = (donationInfo.amount / 100000) * incrementPerHundred;
                        let addedSeconds = Math.floor(addedMinutes * 60);
                        
                        let endSeconds = parseTime(cdData.end);
                        endSeconds += addedSeconds;
                        
                        // Kiểm tra giới hạn (limit)
                        if (cdData.limit && cdData.limit.trim() !== "") {
                            let limitSeconds = parseTime(cdData.limit);
                            if (endSeconds > limitSeconds) {
                                endSeconds = limitSeconds;
                            }
                        }
                        
                        cdData.end = formatTime(endSeconds);
                        
                        // Lưu lại file
                        fs.writeFileSync(cdPath, JSON.stringify(cdData, null, 2), 'utf8');
                        // Báo cho Frontend
                        req.io.emit('update_countdown', cdData);
                        console.log(`[Webhook] Đã cộng thêm ${addedMinutes.toFixed(2)} phút vào Countdown! (End mới: ${cdData.end})`);
                    }
                }
            } catch (err) {
                console.error('[Webhook] Lỗi cập nhật countdown.json:', err.message);
            }

        } else {
            console.log(`[Webhook] => Bỏ qua vì số tiền = 0 hoặc không tìm thấy trường số tiền.`);
        }

        // Trả HTTP 200 OK
        res.status(200).send('Success');

    } catch (error) {
        console.error('[Webhook] Lỗi trong quá trình xử lý:', error);
        // Trả 500 để APIBank retry lại sau
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    handleWebhook
};
