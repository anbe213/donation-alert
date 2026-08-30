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

// Format số tiền VNĐ
const formatMoney = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "đ";
};

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
    
    // Lấy người donate đầu tiên trong hàng đợi
    const data = alertQueue.shift();

    // Cập nhật giao diện
    alertName.innerText = `${data.account_no} vừa donate!`;
    // Hoặc nếu APIBank trả về tên người gửi, đổi thành data.sender_name
    
    alertAmount.innerText = formatMoney(data.amount);
    alertMessage.innerText = `"${data.description}"`;

    // Có thể đổi ảnh ngẫu nhiên nếu muốn
    // alertImage.src = "assets/hinh_moi.gif"; 

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
        const totalItems = 75 * rainDensity; // Tăng thêm lượng item để bù cho thời gian rơi dài ra
        
        for (let i = 0; i < totalItems; i++) {
            const img = document.createElement('img');
            img.src = `assets/item${rainItemTier}.png`;
            img.className = 'rain-item';
            
            // Random vị trí X trên toàn màn hình (0% -> 95%)
            const randomX = Math.floor(Math.random() * 95);
            // Spawn rải rác từ 0s -> 10s để đảm bảo lúc tắt (giây thứ 10) mưa vẫn đang xối xả
            const randomDelay = (Math.random() * 10).toFixed(2);
            // Random tốc độ rơi (3s -> 5s)
            const randomDuration = (3 + Math.random() * 2).toFixed(2);
            
            img.style.left = `${randomX}vw`;
            img.style.animationDelay = `${randomDelay}s`;
            img.style.animationDuration = `${randomDuration}s`;
            
            rainContainer.appendChild(img);
        }
    }, 50);

    // Phát âm thanh mặc định ngay lập tức
    alertSound.currentTime = 0; // Tua lại từ đầu
    alertSound.play().catch(e => {
        // Trình duyệt chặn âm thanh, hiển thị cảnh báo lên màn hình
        if (e.name === 'NotAllowedError') {
            alertMessage.innerText = "[TRÌNH DUYỆT BỊ TẮT TIẾNG: Hãy click chuột 1 lần vào trang web này!]";
        }
    });

    // Phát giọng đọc độc lập sau đúng 3 giây
    setTimeout(() => {
        if (data.tts_url) {
            // Nếu có link Zalo AI thì ưu tiên phát
            const zaloAudio = new Audio(data.tts_url);
            zaloAudio.play().catch(e => {
                alertMessage.innerText = "[LỖI ÂM THANH ZALO]: " + e.message;
            });
        } else if (data.fallback_text && 'speechSynthesis' in window) {
            // Backup: Phát giọng lơ lớ mặc định nếu không có Zalo AI
            try {
                // Đọc toàn bộ câu Tiếng Anh đã được ghép sẵn ở Server
                const utterance = new SpeechSynthesisUtterance(data.fallback_text);
                utterance.lang = 'en-US'; // Ép đọc giọng Tiếng Anh
                utterance.rate = 1.0;
                window.speechSynthesis.speak(utterance);
            } catch (e) {
                alertMessage.innerText = "[LỖI ÂM THANH]: " + e.message;
            }
        }
    }, 3000);

    // Giữ thông báo trên màn hình trong 10 giây (tăng thêm 2s để chờ đọc xong), sau đó ẩn đi
    setTimeout(() => {
        alertContainer.classList.remove('show');
        rainContainer.classList.remove('show'); // Làm mờ toàn bộ cơn mưa cùng lúc
        
        // Đợi CSS transition ẩn đi xong (0.5s) rồi mới dọn dẹp DOM
        setTimeout(() => {
            alertContainer.classList.add('hidden');
            rainContainer.innerHTML = ''; // Xoá sạch các item để nhẹ trình duyệt
            playNextAlert();
        }, 500);

    }, 10000);
}
