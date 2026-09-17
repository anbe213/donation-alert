const socket = io();

// Element references
const liquidBody = document.getElementById('liquid-body');
const dropletsContainer = document.getElementById('droplets-container');
const splashContainer = document.getElementById('splash-container');
const likeTitle = document.getElementById('like-title');
const likeCurrent = document.getElementById('like-current');
const likeTarget = document.getElementById('like-target');
const likePercentBadge = document.getElementById('like-percent-badge');
const widgetWrapper = document.getElementById('like-widget-wrapper');

let previousLikes = null;
let currentLikes = 0;
let targetLikes = 100;

// Khi vừa kết nối tới Server, yêu cầu gửi dữ liệu Like ban đầu
socket.on('connect', () => {
    console.log('[LikeGoal] Đã kết nối Socket.io, yêu cầu tải dữ liệu Like...');
    socket.emit('request_like_init');
});

// Nhận dữ liệu cập nhật like từ Server
socket.on('update_like', (data) => {
    console.log('[LikeGoal] Cập nhật like:', data);
    handleLikeUpdate(data);
});

function handleLikeUpdate(data) {
    if (!data) return;

    if (data.title) {
        likeTitle.innerText = data.title;
    }

    const newTarget = typeof data.target === 'number' ? data.target : 100;
    const newCurrent = typeof data.current === 'number' ? data.current : 0;
    targetLikes = Math.max(1, newTarget);
    likeTarget.innerText = targetLikes.toLocaleString('vi-VN');

    // Lần đầu tiên load trang: Cập nhật ngay mà không kích hoạt giọt nước rơi
    if (previousLikes === null) {
        previousLikes = newCurrent;
        currentLikes = newCurrent;
        updateDisplay(newCurrent, targetLikes, false);
        return;
    }

    // Tính toán số like tăng thêm (delta)
    const delta = typeof data.delta === 'number' && data.delta > 0 
        ? data.delta 
        : Math.max(0, newCurrent - previousLikes);

    previousLikes = newCurrent;
    currentLikes = newCurrent;

    if (delta > 0) {
        // Có like mới: Kích hoạt hiệu ứng giọt nước xanh rơi vào bình
        spawnWaterDroplets(delta, () => {
            updateDisplay(currentLikes, targetLikes, true);
        });
    } else {
        updateDisplay(currentLikes, targetLikes, true);
    }
}

// Cập nhật số hiển thị và mực dung dịch nước xanh
function updateDisplay(current, target, animate) {
    const percentage = Math.min(100, Math.max(0, (current / target) * 100));

    // Nâng mực dung dịch
    liquidBody.style.height = `${percentage}%`;

    // Cập nhật số đếm với hiệu ứng mượt
    animateCounter(parseInt(likeCurrent.innerText.replace(/,/g, '')) || 0, current, 800);

    // Cập nhật huy hiệu %
    likePercentBadge.innerText = `${Math.round(percentage)}% HOÀN THÀNH`;

    // Kích hoạt hiệu ứng ăn mừng khi đạt 100%
    if (percentage >= 100) {
        widgetWrapper.classList.add('goal-reached');
        likePercentBadge.innerText = "🎉 HOÀN THÀNH MỤC TIÊU!";
    } else {
        widgetWrapper.classList.remove('goal-reached');
    }
}

// Hàm kích hoạt các giọt nước rơi nối tiếp nhau
function spawnWaterDroplets(count, onAllDone) {
    // Giới hạn tối đa 20 giọt mỗi lần để tránh làm lag trình duyệt nếu số like tăng vọt
    const dropletsToDrop = Math.min(20, count);
    const dropInterval = 130; // Khoảng cách giữa các giọt nước (130ms)

    for (let i = 0; i < dropletsToDrop; i++) {
        setTimeout(() => {
            createSingleDroplet();
            if (i === dropletsToDrop - 1 && typeof onAllDone === 'function') {
                onAllDone();
            }
        }, i * dropInterval);
    }
}

// Tạo 1 giọt nước rơi từ trên miệng bình
function createSingleDroplet() {
    const droplet = document.createElement('div');
    droplet.className = 'water-droplet';

    // Random nhẹ vị trí X quanh miệng bình (khoảng giữa màn hình 50% +- 10px)
    const randomOffsetX = (Math.random() * 20 - 10).toFixed(1);
    droplet.style.left = `calc(50% + ${randomOffsetX}px)`;

    // Tính điểm rơi Y theo mực nước hiện tại trong bình
    // Chiều cao bình là 250px, miệng bình nằm ở Y ~24px, đáy bình ở Y ~220px
    const currentPercent = parseFloat(liquidBody.style.height) || 0;
    const waterSurfaceY = 220 - (currentPercent * 1.6);
    const targetY = Math.max(40, Math.min(220, waterSurfaceY));
    droplet.style.setProperty('--target-y', `${targetY}px`);

    dropletsContainer.appendChild(droplet);

    // Sau khi rơi tới bề mặt nước (khoảng 700ms), tạo hiệu ứng gợn sóng (ripple)
    setTimeout(() => {
        createSplashRipple(randomOffsetX, targetY);
    }, 700);

    // Dọn dẹp DOM sau khi animation kết thúc
    setTimeout(() => {
        droplet.remove();
    }, 900);
}

// Tạo hiệu ứng gợn sóng (ripple) khi giọt nước chạm mặt dung dịch
function createSplashRipple(offsetX, targetY) {
    const ripple = document.createElement('div');
    ripple.className = 'splash-ripple';
    ripple.style.left = `calc(50% + ${offsetX}px)`;
    ripple.style.top = `${targetY}px`;
    ripple.style.width = '30px';
    ripple.style.height = '12px';

    splashContainer.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 650);
}

// Hiệu ứng nhảy số mượt mà
function animateCounter(startVal, endVal, duration) {
    if (startVal === endVal) return;
    const startTime = performance.now();

    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Easing out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.round(startVal + (endVal - startVal) * easeProgress);

        likeCurrent.innerText = currentVal.toLocaleString('vi-VN');

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        } else {
            likeCurrent.innerText = endVal.toLocaleString('vi-VN');
        }
    }

    requestAnimationFrame(updateNumber);
}
