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
    }
}

// Cập nhật mỗi giây
setInterval(updateUI, 1000);
