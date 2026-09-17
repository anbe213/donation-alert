const fs = require('fs');
const path = require('path');

const likeConfigPath = path.join(__dirname, '../public/like/like.json');

// Hàm đọc file cấu hình like.json
function getLikeConfig() {
    try {
        if (fs.existsSync(likeConfigPath)) {
            const raw = fs.readFileSync(likeConfigPath, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('[LikeService] Lỗi đọc like.json:', e.message);
    }
    return {
        title: "MỤC TIÊU LIKE",
        current: 0,
        target: 100,
        youtube_video_id: "",
        poll_interval_seconds: 15
    };
}

// Hàm ghi file cấu hình like.json
function saveLikeConfig(config) {
    try {
        fs.writeFileSync(likeConfigPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {
        console.error('[LikeService] Lỗi ghi like.json:', e.message);
    }
}

// Hàm lấy số Like từ YouTube
async function fetchYouTubeLikes(videoId) {
    if (!videoId || videoId.trim() === '') return null;

    const trimmedId = videoId.trim();

    // 1. Ưu tiên: Sử dụng YouTube Data API v3 nếu có cấu hình YOUTUBE_API_KEY
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
        try {
            const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${trimmedId}&key=${apiKey}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.items && data.items.length > 0 && data.items[0].statistics) {
                    const likeStr = data.items[0].statistics.likeCount;
                    if (likeStr !== undefined) {
                        return parseInt(likeStr, 10);
                    }
                }
            }
        } catch (err) {
            console.warn('[LikeService] Lỗi gọi YouTube API v3, thử phương án quét trực tiếp:', err.message);
        }
    }

    // 2. Phương án dự phòng: Quét trực tiếp trang xem công khai của YouTube (Không cần API Key)
    try {
        const watchUrl = `https://www.youtube.com/watch?v=${trimmedId}`;
        const res = await fetch(watchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        if (!res.ok) {
            console.warn(`[LikeService] YouTube trả về HTTP ${res.status} cho video ${trimmedId}`);
            return null;
        }

        const html = await res.text();

        // Tìm số like trong ytInitialData hoặc chuỗi JSON nhúng
        // Mẫu 1: "likeCount":"12345"
        const matchLikeCount = html.match(/"likeCount"\s*:\s*"(\d+)"/);
        if (matchLikeCount) {
            return parseInt(matchLikeCount[1], 10);
        }

        // Mẫu 2: "label":"12.345 lượt thích" hoặc "label":"1,234 likes"
        const matchLabel = html.match(/"label"\s*:\s*"([0-9.,\s]+)\s*(lượt thích|likes)"/i);
        if (matchLabel) {
            const rawNumber = matchLabel[1].replace(/[^0-9]/g, '');
            if (rawNumber) {
                return parseInt(rawNumber, 10);
            }
        }

        // Mẫu 3: "simpleText":"1,234" trong khối Like button
        const matchSimple = html.match(/"defaultText"\s*:\s*\{\s*"accessibility"\s*:\s*\{[^}]*?"label"\s*:\s*"([0-9.,]+)[^"]*?"/);
        if (matchSimple) {
            const num = matchSimple[1].replace(/[^0-9]/g, '');
            if (num) return parseInt(num, 10);
        }

    } catch (e) {
        console.error('[LikeService] Lỗi khi quét số like YouTube:', e.message);
    }

    return null;
}

// Khởi chạy bộ quét tự động số like
function startLikePoller(io) {
    console.log('👍 Khởi tạo dịch vụ đồng bộ Like Goal (YouTube)...');

    const checkLikes = async () => {
        const config = getLikeConfig();
        const videoId = config.youtube_video_id;

        if (!videoId || videoId.trim() === '') {
            return;
        }

        const latestLikes = await fetchYouTubeLikes(videoId);
        if (latestLikes !== null && latestLikes !== undefined) {
            const currentLikes = typeof config.current === 'number' ? config.current : 0;
            
            if (latestLikes > currentLikes) {
                const delta = latestLikes - currentLikes;
                console.log(`[LikeService] 🎉 PHÁT HIỆN LIKE MỚI: +${delta} like! (Tổng: ${latestLikes}/${config.target})`);
                
                config.current = latestLikes;
                saveLikeConfig(config);

                // Phát tín hiệu Socket.io xuống OBS
                io.emit('update_like', {
                    current: config.current,
                    target: config.target,
                    delta: delta,
                    title: config.title
                });
            } else if (latestLikes < currentLikes) {
                // Nếu số like trên YT ít hơn (ví dụ bị trừ like hoặc reset), đồng bộ cập nhật lại nhẹ nhàng
                config.current = latestLikes;
                saveLikeConfig(config);
                io.emit('update_like', {
                    current: config.current,
                    target: config.target,
                    delta: 0,
                    title: config.title
                });
            }
        }
    };

    // Kiểm tra lần đầu ngay sau khi bật server 3s
    setTimeout(checkLikes, 3000);

    // Lặp định kỳ mỗi poll_interval_seconds (mặc định 15s)
    setInterval(() => {
        const config = getLikeConfig();
        const interval = Math.max(10, config.poll_interval_seconds || 15);
        checkLikes();
    }, 15000);
}

module.exports = {
    getLikeConfig,
    saveLikeConfig,
    fetchYouTubeLikes,
    startLikePoller
};
