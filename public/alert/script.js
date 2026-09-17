// Bẫy lỗi toàn cục hiển thị lên màn hình để dễ tìm nguyên nhân
window.onerror = function(msg, url, lineNo, columnNo, error) {
    document.body.innerHTML = `<h2 style="color:red; background:white; padding:20px;">LỖI TRÌNH DUYỆT: ${msg}<br>Dòng: ${lineNo}</h2>`;
    return false;
};

// Kết nối tới Socket.io của Server
const socket = io();

// Lấy các element trên giao diện
const alertContainer = document.getElementById('alert-container');
const alertName = document.getElementById('alert-name');
const alertAmount = document.getElementById('alert-amount');
const alertMessage = document.getElementById('alert-message');
const alertSound = document.getElementById('alert-sound');
const alertImage = document.getElementById('alert-image');

// Hàng đợi để xử lý nhiều người donate cùng lúc (tránh chèn lên nhau)
let alertQueue = [];
let isPlaying = false;
let currentTtsAudio = null;
let currentUtterance = null;
let currentWatchdog = null;

// Format số tiền VNĐ
const formatMoney = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "đ";
};

// Hàm dừng và dọn dẹp âm thanh hiện tại nếu có
function stopCurrentAudio() {
    if (currentTtsAudio) {
        try {
            currentTtsAudio.pause();
            currentTtsAudio.currentTime = 0;
            currentTtsAudio.onended = null;
            currentTtsAudio.onerror = null;
        } catch (e) {}
        currentTtsAudio = null;
    }
    if ('speechSynthesis' in window) {
        try {
            window.speechSynthesis.cancel();
        } catch (e) {}
        currentUtterance = null;
    }
}

socket.on('connect', () => {
    alertMessage.innerText = "🔌 ĐÃ KẾT NỐI SERVER THÀNH CÔNG! ĐANG CHỜ DONATE...";
    alertContainer.classList.remove('hidden');
    alertContainer.classList.add('show');
    
    // Tự động ẩn đi sau 3 giây để nhường chỗ
    setTimeout(() => {
        alertContainer.classList.remove('show');
        setTimeout(() => alertContainer.classList.add('hidden'), 500);
    }, 3000);
});

// Lắng nghe sự kiện có người donate
socket.on('new_donation', (data) => {
    console.log('Nhận donate:', data);
    alertQueue.push(data);
    
    // Nếu không có thông báo nào đang chạy, tiến hành hiển thị luôn
    if (!isPlaying) {
        playNextAlert();
    }
});

// Hàm phát thông báo tiếp theo
function playNextAlert() {
    if (alertQueue.length === 0) {
        isPlaying = false;
        return;
    }

    isPlaying = true;
    stopCurrentAudio();
    if (currentWatchdog) {
        clearTimeout(currentWatchdog);
        currentWatchdog = null;
    }
    
    // Lấy người donate đầu tiên trong hàng đợi
    const data = alertQueue.shift();

    // Cố định thời gian hiển thị tối thiểu 7s và khoảng nghỉ 2s giữa các donate trong hàng đợi
    const MIN_DISPLAY_TIME = 7000;
    const DELAY_BETWEEN_ALERTS = 2000;

    // Cập nhật giao diện
    alertName.innerText = `${data.account_no} vừa donate!`;
    alertAmount.innerText = formatMoney(data.amount);
    alertMessage.innerText = `"${data.description}"`;

    // Lấy vùng chứa mưa item
    const rainContainer = document.getElementById('rain-container');
    rainContainer.innerHTML = ''; // Xoá cơn mưa cũ nếu có

    // Bật hiệu ứng CSS
    alertContainer.classList.remove('hidden');
    
    // Đợi 1 chút xíu để DOM render trước khi thêm class show (để animation mượt hơn)
    setTimeout(() => {
        alertContainer.classList.add('show');
        rainContainer.classList.add('show'); // Hiện cơn mưa cùng lúc
        
        // --- Bắt đầu tạo cơn mưa item ---
        const rainItemTier = data.rain_item || 1;
        const rainDensity = data.rain_density || 1;
        const totalItems = 75 * rainDensity;
        
        for (let i = 0; i < totalItems; i++) {
            const img = document.createElement('img');
            img.src = `assets/item${rainItemTier}.png`;
            img.className = 'rain-item';
            
            // Random vị trí X trên toàn màn hình (0% -> 95%)
            const randomX = Math.floor(Math.random() * 95);
            // Spawn rải rác từ 0s -> 20s để mưa rơi liên tục kể cả khi câu đọc rất dài
            const randomDelay = (Math.random() * 20).toFixed(2);
            // Random tốc độ rơi (3s -> 5s)
            const randomDuration = (3 + Math.random() * 2).toFixed(2);
            
            img.style.left = `${randomX}vw`;
            img.style.animationDelay = `${randomDelay}s`;
            img.style.animationDuration = `${randomDuration}s`;
            
            rainContainer.appendChild(img);
        }
    }, 50);

    // Quản lý điều kiện để kết thúc thông báo hiện tại
    let isTtsFinished = false;
    let isMinTimeElapsed = false;
    let isFinishing = false;

    const tryFinishAlert = () => {
        // Chỉ cho phép kết thúc thông báo khi CẢ HAI điều kiện đều thoả mãn:
        // 1. Giọng đọc TTS đã đọc xong hoàn toàn (hoặc bị lỗi / không có TTS)
        // 2. Đã hiển thị đủ thời gian tối thiểu (minDisplayTime)
        if (isTtsFinished && isMinTimeElapsed && !isFinishing) {
            isFinishing = true;

            if (currentWatchdog) {
                clearTimeout(currentWatchdog);
                currentWatchdog = null;
            }

            // Đợi thêm 800ms sau khi đọc xong để người xem kịp nhìn nội dung
            setTimeout(() => {
                // Làm mờ dần thông báo và mưa
                alertContainer.classList.remove('show');
                rainContainer.classList.remove('show');
                
                // Đợi CSS transition ẩn đi xong (0.5s) rồi mới dọn dẹp DOM
                setTimeout(() => {
                    alertContainer.classList.add('hidden');
                    rainContainer.innerHTML = '';
                    stopCurrentAudio();

                    // Nghỉ một khoảng DELAY_BETWEEN_ALERTS (2s) rồi mới phát donate tiếp theo trong hàng đợi
                    setTimeout(() => {
                        playNextAlert();
                    }, DELAY_BETWEEN_ALERTS);

                }, 500);

            }, 800);
        }
    };

    // Điều kiện 1: Đếm ngược thời gian hiển thị tối thiểu (7s)
    setTimeout(() => {
        isMinTimeElapsed = true;
        tryFinishAlert();
    }, MIN_DISPLAY_TIME);

    // Điều kiện 2: Bắt đầu phát giọng đọc ngay lập tức (không cần chờ chuông)
    if (data.local_tts_url) {
        // Ưu tiên 1: Phát giọng VieNeu-TTS (Offline)
        const localAudio = new Audio(data.local_tts_url);
        currentTtsAudio = localAudio;

        localAudio.onended = () => {
            isTtsFinished = true;
            currentTtsAudio = null;
            tryFinishAlert();
        };

        localAudio.onerror = (err) => {
            console.warn('[Alert] Lỗi phát âm thanh local_tts:', err);
            isTtsFinished = true;
            currentTtsAudio = null;
            tryFinishAlert();
        };

        localAudio.play().catch(e => {
            console.warn('[Alert] Không thể phát âm thanh TTS:', e.message);
            alertMessage.innerText = "[LỖI ÂM THANH OFFLINE]: " + e.message;
            isTtsFinished = true;
            currentTtsAudio = null;
            tryFinishAlert();
        });

    } else if (data.fallback_text && 'speechSynthesis' in window) {
        // Backup: Phát giọng lơ lớ mặc định nếu VieNeu bị lỗi hoặc tắt
        try {
            const utterance = new SpeechSynthesisUtterance(data.fallback_text);
            utterance.lang = 'en-US'; // Ép đọc giọng Tiếng Anh
            utterance.rate = 1.0;
            currentUtterance = utterance;

            utterance.onend = () => {
                isTtsFinished = true;
                currentUtterance = null;
                tryFinishAlert();
            };

            utterance.onerror = (err) => {
                console.warn('[Alert] Lỗi SpeechSynthesis:', err);
                isTtsFinished = true;
                currentUtterance = null;
                tryFinishAlert();
            };

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn('[Alert] Lỗi SpeechSynthesis:', e.message);
            alertMessage.innerText = "[LỖI ÂM THANH]: " + e.message;
            isTtsFinished = true;
            currentUtterance = null;
            tryFinishAlert();
        }
    } else {
        // Không có file âm thanh hoặc tin nhắn rỗng
        isTtsFinished = true;
        tryFinishAlert();
    }

    // Watchdog an toàn: Nếu sau 40s âm thanh bị treo bất thường thì tự động giải phóng hàng đợi
    currentWatchdog = setTimeout(() => {
        if (!isFinishing) {
            console.warn('[Alert] Watchdog: Thông báo kéo dài quá 40s, tự động chuyển sang donate tiếp theo.');
            isTtsFinished = true;
            isMinTimeElapsed = true;
            tryFinishAlert();
        }
    }, 40000);
}
