@echo off
title He Thong OBS Donation Alert
echo ==================================================
echo HANG DOI KHOI DONG SERVER DONATION ALERT
echo ==================================================

:: Kiem tra xem Node.js da duoc cai dat chua
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Lỗi: May tinh cua ban chua cai dat Node.js.
    echo Vui long tai va cai dat Node.js tai: https://nodejs.org/
    pause
    exit /b
)

:: Kiem tra xem thu muc node_modules co ton tai khong, neu chua co thi chay npm install
IF NOT EXIST "node_modules\" (
    echo Phat hien ban chua cai dat thu vien...
    echo Dang cai dat cac thu vien can thiet. Chi chay 1 lan dau tien...
    call npm install
    echo Cai dat hoan tat!
)

:: Kiem tra file .env
IF NOT EXIST ".env" (
    echo Canh bao: Khong tim thay file .env! 
    echo Ban chua dieng WEBHOOK_SECRET. He thong tao tam tu file .env.example...
    copy .env.example .env
    echo Vui long mo file .env len bang Notepad, dieng WEBHOOK_SECRET cua apibank.com.vn vao roi chay lai file bat nay.
    pause
    exit /b
)

:: Chay server
echo Dang khoi dong Server...
node server.js

pause
