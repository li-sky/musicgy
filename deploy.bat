@echo off
REM Musicgy 快速部署脚本 (Windows)

echo ==================
echo  Musicgy 部署脚本
echo ==================

REM 检查 Bun
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Bun，请先安装: https://bun.sh
    echo 安装命令: powershell -c "irm bun.sh/install.ps1 | iex"
    pause
    exit /b 1
)
echo [成功] Bun 已安装

REM 检查是否在正确目录
if not exist "package.json" (
    echo [错误] 请在项目根目录运行此脚本
    pause
    exit /b 1
)

REM 拉取最新代码（如果在 git 仓库中）
if exist ".git" (
    echo [信息] 拉取最新代码...
    git pull origin main
)

REM 安装依赖
echo [信息] 安装依赖...
call bun install

REM 创建日志目录
if not exist "logs" mkdir logs

REM 检查环境变量
if not exist ".env" (
    echo [警告] 未找到 .env 文件，创建示例配置...
    (
        echo PORT=3001
        echo NODE_ENV=production
        echo # NETEASE_COOKIE=your_cookie_here
    ) > .env
    echo 请编辑 .env 文件配置必要的环境变量
)

REM 构建前端
echo [信息] 构建前端...
call bun run build

echo.
echo 请选择启动方式:
echo 1) 开发模式 (前端+后端)
echo 2) 生产模式 (PM2)
echo 3) 仅启动后端
echo 4) 仅启动前端
set /p choice="输入选项 [1-4]: "

if "%choice%"=="1" (
    echo [启动] 开发模式...
    call bun run start
) else if "%choice%"=="2" (
    where pm2 >nul 2>nul
    if %errorlevel% neq 0 (
        echo [信息] 安装 PM2...
        call npm install -g pm2
    )
    echo [启动] 生产模式 (PM2)...
    call pm2 start ecosystem.config.js
    call pm2 save
    echo.
    echo [提示] 查看状态: pm2 status
    echo [提示] 查看日志: pm2 logs musicgy-backend
    echo [提示] 重启服务: pm2 restart musicgy-backend
) else if "%choice%"=="3" (
    echo [启动] 仅启动后端...
    call bun run server
) else if "%choice%"=="4" (
    echo [启动] 仅启动前端...
    call bun run dev
) else (
    echo [错误] 无效选项
)

pause
