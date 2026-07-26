@echo off
echo ========================================
echo  清除 Windows 图标缓存
echo ========================================
echo.

echo 正在终止 Explorer 进程...
taskkill /f /im explorer.exe >nul 2>&1

echo 正在删除图标缓存文件...
del /f /q "%localappdata%\IconCache.db" >nul 2>&1
del /f /q "%localappdata%\Microsoft\Windows\Explorer\iconcache*" >nul 2>&1

echo 正在重启 Explorer...
start explorer.exe

echo.
echo 图标缓存已清除！
echo 请重新安装应用程序以查看新图标。
pause