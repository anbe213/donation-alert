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
