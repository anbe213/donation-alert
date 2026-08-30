const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Kết nối hoặc tạo mới file database
const dbPath = path.resolve(__dirname, 'apibank_donations.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Lỗi khi kết nối database:', err.message);
    }
});

// Khởi tạo bảng
db.serialize(() => {
    // Bảng webhook_events để chống trùng lặp (Idempotency)
    db.run(`
        CREATE TABLE IF NOT EXISTS webhook_events (
            event_id TEXT PRIMARY KEY,
            processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Bảng donations lưu trữ giao dịch thành công
    db.run(`
        CREATE TABLE IF NOT EXISTS donations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT UNIQUE,
            bank_code TEXT,
            account_no TEXT,
            amount INTEGER,
            description TEXT,
            transaction_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

/**
 * Kiểm tra xem event_id đã được xử lý chưa
 * @param {string} eventId 
 * @returns {Promise<boolean>} true nếu đã tồn tại, false nếu chưa
 */
const hasEventBeenProcessed = (eventId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT event_id FROM webhook_events WHERE event_id = ?', [eventId], (err, row) => {
            if (err) return reject(err);
            resolve(!!row);
        });
    });
};

/**
 * Lưu event_id để đánh dấu là đã xử lý
 * @param {string} eventId 
 */
const markEventAsProcessed = (eventId) => {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO webhook_events (event_id) VALUES (?)', [eventId], function(err) {
            if (err) return reject(err);
            resolve(this.lastID);
        });
    });
};

/**
 * Lưu thông tin giao dịch donate
 * @param {Object} data 
 */
const saveDonation = (data) => {
    return new Promise((resolve, reject) => {
        const { event_id, bank_code, account_no, amount, description, transaction_date } = data;
        db.run(
            'INSERT INTO donations (event_id, bank_code, account_no, amount, description, transaction_date) VALUES (?, ?, ?, ?, ?, ?)',
            [event_id, bank_code, account_no, amount, description, transaction_date],
            function(err) {
                if (err) return reject(err);
                resolve(this.lastID);
            }
        );
    });
};

module.exports = {
    hasEventBeenProcessed,
    markEventAsProcessed,
    saveDonation
};
