const socket = io();

const titleEl = document.getElementById('cd-title');
const middleEl = document.getElementById('cd-middle');
const endEl = document.getElementById('cd-end');
const fillEl = document.getElementById('countdown-bar-fill');

let countdownData = null;

socket.on('connect', () => {
    socket.emit('request_countdown_init');
});

socket.on('update_countdown', (data) => {
    countdownData = data;
    updateUI();
});

function formatTime(date) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function updateUI() {
    if (!countdownData) return;
    
    titleEl.innerText = countdownData.title;
    
    const dateA = new Date(countdownData.dateA);
    const dateB = new Date(countdownData.dateB);
    const now = new Date();
    
    // Bên phải là dateB (Giờ kết thúc)
    endEl.innerText = "End: " + formatTime(dateB);
    
    // Tính toán thời gian còn lại
    const remainingMs = dateB.getTime() - now.getTime();
    
    if (remainingMs <= 0) {
        middleEl.innerText = "HẾT GIỜ!";
        fillEl.style.width = '100%';
        return;
    }
    
    // Chuyển đổi sang HH:MM:SS
    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Ở giữa: Thể hiện Date A (Giờ bắt đầu) và Thời gian đếm ngược
    middleEl.innerText = `${formatTime(dateA)} ⏳ ${timeStr}`;
    
    // Tính toán phần trăm thanh chạy
    const totalDuration = dateB.getTime() - dateA.getTime();
    const elapsed = now.getTime() - dateA.getTime();
    
    let percentage = (elapsed / totalDuration) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    
    fillEl.style.width = `${percentage}%`;
}

// Cập nhật mỗi giây
setInterval(updateUI, 1000);
