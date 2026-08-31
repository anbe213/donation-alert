const socket = io();

// Format tiền có dấu phẩy
const formatMoney = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Cập nhật giao diện Potion
const updatePotionUI = (current, target, percentage, title) => {
    document.getElementById('theme-potion').style.display = 'block';
    document.getElementById('theme-bar').style.display = 'none';

    document.getElementById('goal-title').innerText = title;
    document.getElementById('goal-text').innerText = `${formatMoney(current)} / ${formatMoney(target)}`;
    document.getElementById('liquid').style.height = `${percentage}%`;
    
    const percentEl = document.getElementById('percent-text');
    if (percentEl) {
        percentEl.innerText = `${Math.floor(percentage)}%`;
    }
};

// Cập nhật giao diện Bar
const updateBarUI = (current, target, percentage, title) => {
    document.getElementById('theme-bar').style.display = 'block';
    document.getElementById('theme-potion').style.display = 'none';

    document.getElementById('bar-title-text').innerText = title;
    document.getElementById('bar-current-text').innerText = formatMoney(current);
    document.getElementById('bar-target-text').innerText = formatMoney(target);
    
    document.getElementById('progress-fill').style.width = `${percentage}%`;

    // Cập nhật nhân vật chạy trên thanh
    const charImg = document.getElementById('bar-character');
    if (charImg) {
        // Tính toán index (1 đến 10)
        // VD: 0 - 9.99% -> enemy1.gif
        // ... 90 - 100% -> enemy10.gif
        let charIndex = Math.floor(percentage / 10) + 1;
        if (charIndex > 10) charIndex = 10;
        if (charIndex < 1) charIndex = 1;
        
        const newSrc = `assets/enemy${charIndex}.gif`;
        // Tránh gán lại src liên tục gây giật lag ảnh
        if (!charImg.src.endsWith(newSrc)) {
            charImg.src = newSrc;
        }
        
        charImg.style.display = 'block';
        charImg.style.left = `${percentage}%`;
    }
};

// Hàm cập nhật chung
const updateGoalUI = (goalData) => {
    if (!goalData) return;

    const current = goalData.current || 0;
    const target = goalData.target || 1; 
    const title = goalData.title || "Donation Goal";
    const type = goalData.type || "potion";

    let percentage = (current / target) * 100;
    if (percentage > 100) percentage = 100;
    if (percentage < 0) percentage = 0;

    if (type === 'bar') {
        updateBarUI(current, target, percentage, title);
    } else {
        updatePotionUI(current, target, percentage, title);
    }
};

// Khi vừa mở trang, yêu cầu Server gửi số liệu Goal hiện tại
socket.on('connect', () => {
    console.log("Đã kết nối Server. Yêu cầu tải dữ liệu Goal...");
    socket.emit('request_goal_init');
});

// Lắng nghe sự kiện
socket.on('update_goal', (goalData) => {
    console.log("Cập nhật Goal:", goalData);
    updateGoalUI(goalData);
});
