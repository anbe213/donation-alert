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
