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
        
        // In ra toàn bộ dữ liệu để "bắt bệnh"
        console.log(`[Webhook] Payload giải mã thành công:`, JSON.stringify(data, null, 2));
        
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

        // --- Hàm dọn dẹp nội dung rác của ngân hàng ---
        const extractMessageAndSender = (desc) => {
            let result = { message: 'Không có lời nhắn', senderName: 'Người xem ẩn danh' };
            if (!desc) return result;
            
            let msg = desc;
            
            // 1. Tách tên người gửi bằng cụm ".CT tu <STK> <TÊN> toi"
            const senderMatch = msg.match(/\.?CT tu (?:[0-9]+ )?([^.]*?) toi /i);
            if (senderMatch && senderMatch[1]) {
                result.senderName = senderMatch[1].trim();
            }

            // 2. Tách lời nhắn (Xử lý định dạng cũ có chữ "ND")
            // Cấu trúc: ... ND MBVCB.12345.MãGD.NộiDung.CT tu ...
            const oldRegex = /ND [a-zA-Z0-9]+\.[0-9]+\.[a-zA-Z0-9]+\.(.*?)\.CT tu/i;
            const match1 = msg.match(oldRegex);
            if (match1 && match1[1]) {
                result.message = match1[1].trim();
                return result;
            }

            // 3. Tách lời nhắn (Xử lý định dạng mới tinh)
            // Cấu trúc: MBVCB.12345.MãGD.NộiDung.CT tu ...
            const newRegex = /[a-zA-Z0-9]+\.[0-9]+\.[a-zA-Z0-9]+\.(.*?)\.CT tu/i;
            const match2 = msg.match(newRegex);
            if (match2 && match2[1]) {
                result.message = match2[1].trim();
                return result;
            }

            // Xử lý chung cho các ngân hàng khác (xoá tiền tố, hậu tố)
            msg = msg.replace(/^NHAN TU [a-zA-Z0-9]+ (TRACE|GD) [a-zA-Z0-9]+ ND /i, '');
            msg = msg.replace(/\.?CT tu .*$/i, '');
            msg = msg.replace(/\.?Chuyen tien tu .*$/i, '');
            
            if (msg.includes('.')) {
                let parts = msg.split('.');
                if (parts.length > 2) {
                    msg = parts.slice(2).join('.');
                }
            }

            result.message = msg.trim() || 'Không có lời nhắn';
            return result;
        };

        const extractedData = extractMessageAndSender(tx.description || tx.content);

        const donationInfo = {
            event_id: currentEventId,
            bank_code: tx.bank_code || 'APIBANK',
            account_no: extractedData.senderName, // Gán tên người gửi vào đây để hiển thị lên màn hình
            amount: parseInt(tx.amount) || parseInt(tx.signed_amount) || 0,
            description: extractedData.message,
            transaction_date: tx.happened_at || new Date().toISOString()
        };

        // Đọc file config.json để lấy template lời đọc
        const fs = require('fs');
        const path = require('path');
        let enableVieneu = false;
        let vieneuVoice = "Phạm Tuyên";
        let rainDensity = 1;
        let rainTiers = { tier1_min: 0, tier2_min: 20000, tier3_min: 50000, tier4_min: 100000 };
        
        try {
            const configPath = path.join(__dirname, '../public/alert/config.json');
            const fileContent = fs.readFileSync(configPath, 'utf8');
            const configData = JSON.parse(fileContent);
            if (configData.tts_vietnamese) ttsViTemplate = configData.tts_vietnamese;
            if (configData.tts_english) ttsEnTemplate = configData.tts_english;
            if (configData.enable_vieneu_tts !== undefined) enableVieneu = configData.enable_vieneu_tts;
            if (configData.vieneu_voice) vieneuVoice = configData.vieneu_voice;
            if (configData.rain_density !== undefined) rainDensity = configData.rain_density;
            if (configData.rain_tiers) rainTiers = configData.rain_tiers;
        } catch (e) {
            console.error('[Webhook] Không thể đọc file config.json, dùng mặc định.');
        }

        const nameStr = donationInfo.account_no;
        // Gửi số nguyên gốc (không phẩy/chấm) để AI tự động hiểu và đọc đúng hàng trăm, ngàn, triệu
        const amountStrVi = donationInfo.amount.toString();
        const amountStrEn = donationInfo.amount.toString();
        
        // Loại bỏ các thẻ trong ngoặc vuông (như [cười khẩy], [thở dài]) để bot không tự diễn
        const msgStr = (donationInfo.description || "").replace(/\[.*?\]/g, '').trim();

        const fullTextVi = ttsViTemplate
            .replace('{name}', nameStr)
            .replace('{amount}', amountStrVi)
            .replace('{message}', msgStr);

        const fullTextEn = ttsEnTemplate
            .replace('{name}', nameStr)
            .replace('{amount}', amountStrEn)
            .replace('{message}', msgStr);
        
        donationInfo.fallback_text = fullTextEn; // Lưu để truyền xuống Frontend đọc Tiếng Anh nếu cần
        
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
        if (enableVieneu && donationInfo.amount > 0 && donationInfo.description && donationInfo.description !== 'Không có lời nhắn') {
            try {
                const { execSync } = require('child_process');
                const fileName = `tts_${Date.now()}.wav`;
                // Lưu vào public/alert/assets để frontend có thể truy cập qua URL
                const outputFilePath = path.join(__dirname, '../public/alert/assets', fileName);
                
                console.log(`[VieNeu-TTS] Đang gọi Python sinh giọng đọc offline...`);
                // Gọi script python (chặn Node.js trong 1-2s cho đến khi xong)
                execSync(`python tts_worker.py --text "${fullTextVi}" --output "${outputFilePath}" --voice "${vieneuVoice}"`, {
                    cwd: path.join(__dirname, '..'), // Chạy ở thư mục gốc project
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                
                console.log(`[VieNeu-TTS] Tạo thành công! File: ${fileName}`);
                donationInfo.local_tts_url = `assets/${fileName}`;
            } catch (err) {
                console.error('[VieNeu-TTS] Lỗi sinh giọng đọc Python:', err.message);
                if (err.stdout) console.error('Python STDOUT:', err.stdout);
                if (err.stderr) console.error('Python STDERR:', err.stderr);
            }
        }

        console.log(`[Webhook] Phân tích số tiền: ${donationInfo.amount}đ, Tin nhắn: "${donationInfo.description}"`);

        if (donationInfo.amount > 0) {
            await db.saveDonation(donationInfo);
            req.io.emit('new_donation', donationInfo);
            console.log(`[Webhook] => NHẬN DONATE THÀNH CÔNG: ${donationInfo.amount}đ`);
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
