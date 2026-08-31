const socket = io();

const titleEl = document.getElementById('goal-title');
const liquidEl = document.getElementById('liquid');
const textEl = document.getElementById('goal-text');

// Format tiền có dấu phẩy
const formatMoney = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Hàm cập nhật giao diện
const updateGoalUI = (goalData) => {
    if (!goalData) return;

    // Cập nhật tiêu đề
    titleEl.innerText = goalData.title || "Donation Goal";

    // Cập nhật text số tiền
    const current = goalData.current || 0;
    const target = goalData.target || 1; // Tránh chia cho 0
    textEl.innerText = `${formatMoney(current)} / ${formatMoney(target)}`;

    // Cập nhật chiều cao chất lỏng
    let percentage = (current / target) * 100;
    if (percentage > 100) percentage = 100; // Đầy bình thì dừng ở 100%
    if (percentage < 0) percentage = 0;
    
    liquidEl.style.height = `${percentage}%`;
    
    const percentEl = document.getElementById('percent-text');
    if (percentEl) {
        percentEl.innerText = `${Math.floor(percentage)}%`;
    }
};

// Khi vừa mở trang, yêu cầu Server gửi số liệu Goal hiện tại
socket.on('connect', () => {
    console.log("Đã kết nối Server. Yêu cầu tải dữ liệu Goal...");
    socket.emit('request_goal_init');
});

// Lắng nghe sự kiện khi có donate mới hoặc nhận data khởi tạo
socket.on('update_goal', (goalData) => {
    console.log("Cập nhật Goal:", goalData);
    updateGoalUI(goalData);
});
