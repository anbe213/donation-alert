const socket = io();

const titleEl = document.getElementById('title-text');
const currentEl = document.getElementById('current-text');
const targetEl = document.getElementById('target-text');
const fillEl = document.getElementById('progress-fill');

// Format tiền có dấu phẩy
const formatMoney = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Cập nhật UI
const updateGoalUI = (goalData) => {
    if (!goalData) return;

    titleEl.innerText = goalData.title || "Donation Goal";

    const current = goalData.current || 0;
    const target = goalData.target || 1; // Tránh chia cho 0

    // Trong ảnh mẫu chỉ có kí hiệu $ mà không có VNĐ, ta dùng đ hoặc bỏ tùy biến.
    // Nếu bạn muốn bỏ 'đ', có thể chỉ dùng formatMoney
    currentEl.innerText = `${formatMoney(current)}`;
    targetEl.innerText = `${formatMoney(target)}`;

    let percentage = (current / target) * 100;
    if (percentage > 100) percentage = 100;
    if (percentage < 0) percentage = 0;
    
    fillEl.style.width = `${percentage}%`;
};

// Kết nối
socket.on('connect', () => {
    socket.emit('request_goal_init');
});

// Update data
socket.on('update_goal', (goalData) => {
    updateGoalUI(goalData);
});
