const socket = io();

// Element references
const svgLiquidBody = document.getElementById('svg-liquid-body');
const svgWaveGroup = document.getElementById('svg-wave-group');
const svgLiquidGlow = document.getElementById('svg-liquid-glow');
const svgBubbles = document.getElementById('svg-bubbles');
const jarContainer = document.getElementById('jar-container');
const dropletsContainer = document.getElementById('droplets-container');
const likeTitle = document.getElementById('like-title');
const likeCurrent = document.getElementById('like-current');
const likeTarget = document.getElementById('like-target');
const likePercentBadge = document.getElementById('like-percent-badge');
const widgetWrapper = document.getElementById('like-widget-wrapper');

let previousLikes = null;
let currentLikes = 0;
let targetLikes = 100;
let currentAnimatedPercent = 0;
let liquidAnimFrame = null;

// Khởi tạo mức nước ban đầu ở 0%
applyLiquidLevel(0);

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

    if (animate) {
        animateLiquidLevel(currentAnimatedPercent, percentage, 800);
        animateCounter(parseInt(likeCurrent.innerText.replace(/,/g, '')) || 0, current, 800);
    } else {
        currentAnimatedPercent = percentage;
        applyLiquidLevel(percentage);
        likeCurrent.innerText = current.toLocaleString('vi-VN');
    }

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

// Áp dụng mực dung dịch trong bình SVG (0% -> 100%)
// Tọa độ bình: Đáy là Y=218, Đỉnh chất lỏng tối đa là Y=36 (chiều cao = 182px)
function applyLiquidLevel(percent) {
    const maxH = 182;
    const bottomY = 218;
    const h = (percent / 100) * maxH;
    const y = bottomY - h;

    if (svgLiquidBody) {
        svgLiquidBody.setAttribute('y', y.toFixed(2));
        svgLiquidBody.setAttribute('height', h.toFixed(2));
    }

    if (svgWaveGroup) {
        svgWaveGroup.setAttribute('transform', `translate(0, ${y.toFixed(2)})`);
        if (percent <= 0.8) {
            svgWaveGroup.style.opacity = '0';
        } else {
            svgWaveGroup.style.opacity = '1';
        }
    }

    if (svgLiquidGlow) {
        svgLiquidGlow.style.opacity = percent > 15 ? '1' : (percent > 3 ? '0.4' : '0');
    }

    if (svgBubbles) {
        svgBubbles.style.opacity = percent > 8 ? '1' : (percent > 2 ? '0.3' : '0');
    }
}

// Animation chuyển động mực nước mượt mà theo hàm cubic
function animateLiquidLevel(startPercent, endPercent, duration) {
    if (liquidAnimFrame) {
        cancelAnimationFrame(liquidAnimFrame);
    }

    if (Math.abs(startPercent - endPercent) < 0.1) {
        currentAnimatedPercent = endPercent;
        applyLiquidLevel(endPercent);
        return;
    }

    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const val = startPercent + (endPercent - startPercent) * easeOut;
        currentAnimatedPercent = val;
        applyLiquidLevel(val);

        if (progress < 1) {
            liquidAnimFrame = requestAnimationFrame(step);
        } else {
            currentAnimatedPercent = endPercent;
            applyLiquidLevel(endPercent);
        }
    }

    liquidAnimFrame = requestAnimationFrame(step);
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

    // Random nhẹ vị trí X quanh miệng bình (khoảng giữa màn hình 50% +- 8px)
    const randomOffsetX = (Math.random() * 16 - 8).toFixed(1);
    droplet.style.left = `calc(50% + ${randomOffsetX}px)`;

    // Tính điểm rơi Y theo mực nước hiện tại trong bình
    // Bình nằm trong #jar-container (viewBox 0 0 160 220)
    const maxH = 182;
    const bottomY = 218;
    const surfaceSvgY = bottomY - (currentAnimatedPercent / 100) * maxH;

    const containerTop = jarContainer ? jarContainer.offsetTop : 90;
    const scale = jarContainer ? (jarContainer.clientHeight / 220) : 1.136;
    const targetY = Math.round(containerTop + (surfaceSvgY * scale));

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
    ripple.style.width = '28px';
    ripple.style.height = '10px';

    dropletsContainer.appendChild(ripple);

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
