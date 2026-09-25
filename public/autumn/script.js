// Tải và áp dụng cấu hình từ autumn.json
async function loadAutumnConfig() {
    try {
        const response = await fetch(`autumn.json?t=${Date.now()}`);
        if (!response.ok) return;
        const config = await response.json();

        // 1. Khoảng cách lồng đèn từ 2 bên mép vào giữa (mặc định 155px, đã dịch 100px so với mép 55px ban đầu)
        if (config.lantern_offset !== undefined) {
            const offset = typeof config.lantern_offset === 'number' ? `${config.lantern_offset}px` : config.lantern_offset;
            document.documentElement.style.setProperty('--lantern-offset', offset);
        }

        // 2. Chữ trên lồng đèn
        const leftTextEl = document.getElementById('lantern-left-text');
        const rightTextEl = document.getElementById('lantern-right-text');
        if (leftTextEl && config.lantern_left_text) leftTextEl.innerText = config.lantern_left_text;
        if (rightTextEl && config.lantern_right_text) rightTextEl.innerText = config.lantern_right_text;

        // 3. Ẩn/hiện viền sát màn hình
        const borderEl = document.getElementById('decor-border');
        if (borderEl && config.show_border !== undefined) {
            borderEl.style.display = config.show_border ? 'block' : 'none';
        }

        // 4. Ẩn/hiện 4 góc hoa văn
        const corners = document.querySelectorAll('.decor-corner');
        if (config.show_corners !== undefined) {
            corners.forEach(c => c.style.display = config.show_corners ? 'block' : 'none');
        }

        // 5. Ẩn/hiện lồng đèn
        const lanternsEl = document.getElementById('lanterns-container');
        if (lanternsEl && config.show_lanterns !== undefined) {
            lanternsEl.style.display = config.show_lanterns ? 'block' : 'none';
        }

        // 6. Ẩn/hiện trăng rằm
        const moonEl = document.getElementById('decor-moon-cluster');
        if (moonEl && config.show_moon !== undefined) {
            moonEl.style.display = config.show_moon ? 'block' : 'none';
        }

        // 7. Ẩn/hiện tinh tú đom đóm
        const stardustEl = document.getElementById('stardust-container');
        if (stardustEl && config.show_stardust !== undefined) {
            stardustEl.style.display = config.show_stardust ? 'block' : 'none';
        }
    } catch (e) {
        console.warn('Không tải được autumn.json, sử dụng giao diện mặc định:', e);
    }
}

document.addEventListener('DOMContentLoaded', loadAutumnConfig);
