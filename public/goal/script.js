const socket = io();

// Format tiền có dấu phẩy
const formatMoney = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Cập nhật giao diện Potion
const updatePotionUI = (current, target, percentage, title) => {
    document.getElementById('theme-potion').style.display = 'block';
    document.getElementById('theme-bar').style.display = 'none';
    const midAutumnEl = document.getElementById('theme-mid-autumn');
    if (midAutumnEl) midAutumnEl.style.display = 'none';

    document.getElementById('goal-title').innerText = title;
    document.getElementById('goal-text').innerText = `${formatMoney(current)} / ${formatMoney(target)}`;
    document.getElementById('liquid').style.height = `${percentage}%`;
    
    const percentEl = document.getElementById('percent-text');
    if (percentEl) {
        percentEl.innerText = `${Math.floor(percentage)}%`;
    }
};

// Cập nhật giao diện Bar
const updateBarUI = (current, target, percentage, title, enemySize) => {
    document.getElementById('theme-bar').style.display = 'block';
    document.getElementById('theme-potion').style.display = 'none';
    const midAutumnEl = document.getElementById('theme-mid-autumn');
    if (midAutumnEl) midAutumnEl.style.display = 'none';

    document.getElementById('bar-title-text').innerText = title;
    document.getElementById('bar-current-text').innerText = formatMoney(current);
    document.getElementById('bar-target-text').innerText = formatMoney(target);
    
    document.getElementById('progress-fill').style.width = `${percentage}%`;

    // Cập nhật nhân vật chạy trên thanh
    const charImg = document.getElementById('bar-character');
    if (charImg) {
        // Cập nhật kích thước nhân vật (mặc định 60px)
        const baseHeight = 60;
        charImg.style.height = `${baseHeight * enemySize}px`;

        // Tính toán index (1 đến 8)
        let charIndex = Math.floor(percentage / 12.5) + 1;
        if (charIndex > 8) charIndex = 8;
        if (charIndex < 1) charIndex = 1;
        
        const webpSrc = `assets/enemy${charIndex}.webp`;
        const gifSrc = `assets/enemy${charIndex}.gif`;
        
        if (!charImg.src.endsWith(webpSrc) && !charImg.src.endsWith(gifSrc)) {
            charImg.src = webpSrc;
            charImg.onerror = () => {
                if (charImg.src.endsWith('.webp')) {
                    charImg.src = gifSrc;
                }
            };
        }
        
        charImg.style.display = 'block';
        charImg.style.left = `${percentage}%`;
    }
};

// Helper trích xuất 4 goals từ config mid_autumn
const getMidAutumnGoals = (midAutumnData) => {
    if (!midAutumnData) return [];
    if (Array.isArray(midAutumnData.goals)) {
        return midAutumnData.goals;
    }
    // Hỗ trợ cả định dạng object { goal1: {...}, goal2: {...} } hoặc { goal_1: {...} }
    const list = [];
    for (let i = 1; i <= 10; i++) {
        const item = midAutumnData[`goal${i}`] || midAutumnData[`goal_${i}`];
        if (item) list.push(item);
    }
    return list;
};

// Cập nhật giao diện Mid-Autumn (Trung Thu 4 bậc Goal)
const updateMidAutumnUI = (current, midAutumnConfig) => {
    const potionEl = document.getElementById('theme-potion');
    const barEl = document.getElementById('theme-bar');
    const midAutumnEl = document.getElementById('theme-mid-autumn');

    if (potionEl) potionEl.style.display = 'none';
    if (barEl) barEl.style.display = 'none';
    if (midAutumnEl) midAutumnEl.style.display = 'block';

    const rawGoals = getMidAutumnGoals(midAutumnConfig);

    // Danh sách 4 goals mặc định nếu chưa cấu hình
    const defaultGoals = [
        { target: 500000, title: "Mục tiêu 1: Rước Đèn Ông Sao", image: "assets/mid_autumn_1.svg" },
        { target: 1000000, title: "Mục tiêu 2: Bánh Dẻo Đậu Xanh", image: "assets/mid_autumn_2.svg" },
        { target: 1500000, title: "Mục tiêu 3: Múa Lân Phá Cỗ", image: "assets/mid_autumn_3.svg" },
        { target: 2000000, title: "Mục tiêu 4: Ngắm Trăng Rằm Đoàn Viên", image: "assets/mid_autumn_4.svg" }
    ];

    const goals = rawGoals.length > 0 ? rawGoals : defaultGoals;

    // 1. Xác định bậc Goal hiện tại dựa trên số tiền donate (current)
    let activeIndex = 0;
    for (let i = 0; i < goals.length; i++) {
        if (current < goals[i].target) {
            activeIndex = i;
            break;
        }
        if (i === goals.length - 1) {
            activeIndex = i; // Đã đạt hoặc vượt mốc cao nhất
        }
    }

    const currentGoal = goals[activeIndex];
    const prevTarget = activeIndex === 0 ? 0 : (goals[activeIndex - 1].target || 0);
    const currTarget = currentGoal.target || (prevTarget + 1);

    // 2. Tính % hoàn thành của bậc Goal hiện tại (từ 0% đến 100%)
    let percentage = 0;
    const isAllCompleted = current >= goals[goals.length - 1].target;

    if (isAllCompleted) {
        percentage = 100;
    } else {
        const span = currTarget - prevTarget;
        if (span > 0) {
            percentage = ((current - prevTarget) / span) * 100;
        }
        percentage = Math.max(0, Math.min(100, percentage));
    }

    // 3. Cập nhật thanh trượt và vị trí khung ảnh chạy theo tiến trình
    const progressFill = document.getElementById('mid-autumn-progress-fill');
    const frameContainer = document.getElementById('mid-autumn-frame-container');
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (frameContainer) frameContainer.style.left = `${percentage}%`;

    // 4. Cập nhật Title: Chỉ hiện duy nhất title của bậc goal hiện tại (Hoàn toàn ẩn số tiền)
    const titleText = document.getElementById('mid-autumn-title-text');
    if (titleText) {
        titleText.innerText = currentGoal.title || `Mục tiêu ${activeIndex + 1}`;
    }

    // 5. Cập nhật ảnh vào khung ảnh (khóa viền overflow:hidden, không bao giờ tràn khung)
    const photoImg = document.getElementById('mid-autumn-photo');
    const placeholder = document.getElementById('mid-autumn-placeholder');

    if (photoImg) {
        const targetSrc = currentGoal.image || '';
        if (targetSrc.trim() !== '') {
            // Nếu ảnh khác với ảnh đang hiển thị thì cập nhật
            if (!photoImg.src.endsWith(targetSrc)) {
                photoImg.src = targetSrc;
            }
            photoImg.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';

            // Xử lý khi đường dẫn ảnh lỗi hoặc streamer chưa đưa ảnh vào assets
            photoImg.onerror = () => {
                photoImg.style.display = 'none';
                if (placeholder) {
                    placeholder.style.display = 'flex';
                    const iconEl = placeholder.querySelector('.placeholder-icon');
                    if (iconEl) {
                        const icons = ['🏮', '🥮', '🦁', '🌕'];
                        iconEl.innerText = icons[activeIndex % icons.length];
                    }
                }
            };
        } else {
            photoImg.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
        }
    }

    // 6. Hiệu ứng ăn mừng khi hoàn thành tất cả mục tiêu
    if (isAllCompleted && midAutumnEl) {
        midAutumnEl.classList.add('mid-autumn-completed');
    } else if (midAutumnEl) {
        midAutumnEl.classList.remove('mid-autumn-completed');
    }
};

// Hàm cập nhật chung
const updateGoalUI = (goalData) => {
    if (!goalData) return;

    const current = goalData.current || 0;
    const target = goalData.target || 1; 
    const title = goalData.title || "Donation Goal";
    const type = goalData.type || "potion";
    const enemySize = goalData.enemySize || 1;

    let percentage = (current / target) * 100;
    if (percentage > 100) percentage = 100;
    if (percentage < 0) percentage = 0;

    if (type === 'mid-autumn' || type === 'mid_autumn') {
        updateMidAutumnUI(current, goalData.mid_autumn);
    } else if (type === 'bar') {
        updateBarUI(current, target, percentage, title, enemySize);
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
