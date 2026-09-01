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

function parseTime(str) {
    const parts = (str || "00:00:00").split(':').map(Number);
    let hours = parts[0] || 0;
    let minutes = parts[1] || 0;
    let seconds = parts[2] || 0;
    return hours * 3600 + minutes * 60 + seconds;
}

function formatTime(totalSeconds) {
    let h = Math.floor(totalSeconds / 3600);
    let m = Math.floor((totalSeconds % 3600) / 60);
    let s = Math.floor(totalSeconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateUI() {
    if (!countdownData) return;
    
    titleEl.innerText = countdownData.title;
    endEl.innerText = countdownData.end;
    
    let startSeconds = parseTime(countdownData.start);
    let endSeconds = parseTime(countdownData.end);
    let realStartTime = countdownData.real_start_time ? new Date(countdownData.real_start_time).getTime() : Date.now();
    let now = Date.now();
    
    let elapsedRealSeconds = Math.floor((now - realStartTime) / 1000);
    if (elapsedRealSeconds < 0) elapsedRealSeconds = 0;
    
    let currentSeconds = startSeconds + elapsedRealSeconds;
    
    if (currentSeconds >= endSeconds) {
        middleEl.innerText = formatTime(endSeconds) + " (HẾT GIỜ!)";
        fillEl.style.width = '100%';
    } else {
        middleEl.innerText = formatTime(currentSeconds);
        
        let totalDuration = endSeconds - startSeconds;
        let percentage = 0;
        if (totalDuration > 0) {
            percentage = ((currentSeconds - startSeconds) / totalDuration) * 100;
        }
        
        if (percentage < 0) percentage = 0;
        if (percentage > 100) percentage = 100;
        
        fillEl.style.width = `${percentage}%`;
        
        // --- Xử lý Nhân vật cưỡi trên thanh (Enemy) ---
        const charEl = document.getElementById('cd-character');
        charEl.style.display = 'block';
        
        // Tính left position (phải trừ hao paddding 2 bên nếu có, nhưng ở đây width 100% nên gán % luôn)
        // Để nhân vật không bị cắt mất ở mép, ta giữ nguyên transform: translateX(-50%) ở CSS.
        // Giới hạn ở 100%
        charEl.style.left = `${percentage}%`;
        
        // Chọn ảnh Enemy theo 4 giai đoạn
        let enemyIndex = 1;
        if (percentage < 25) {
            enemyIndex = 1;
        } else if (percentage < 50) {
            enemyIndex = 2;
        } else if (percentage < 75) {
            enemyIndex = 3;
        } else {
            enemyIndex = 4;
        }
        
        const expectedSrc = `assets/enemy${enemyIndex}.webp`;
        // Chỉ gán lại src nếu nó thay đổi để tránh ảnh bị giật (reload) liên tục
        if (!charEl.src.includes(`enemy${enemyIndex}.webp`) && !charEl.src.includes(`enemy${enemyIndex}.gif`)) {
            charEl.src = expectedSrc;
        }
    }
}

// Cập nhật mỗi giây
setInterval(updateUI, 1000);
