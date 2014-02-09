@echo off
echo. 检测环境...
ehco. 寻找 node 路径…
where node
if %errorlevel% neq 0 goto nonode
ehco. 寻找 coffee 路径…
where coffee
if %errorlevel% neq 0 call :noCoffee
echo 安装 nodejs 组件 :3
start /wait cmd /c npm install
goto finish

:nonode
echo. 请先安装 NodeJS!
echo. 官方网站: [http://nodejs.org]
echo. 按下任意键开启官网; 否则请按 Ctrl+C 强制退出
goto finish

:noCoffee
echo. 检测到 Nodejs 环境但是未发现 CoffeeScript 环境… 
echo. 按下任意键开始安装; 否则请按 Ctrl+C 强制退出
pause>nul
start /wait cmd /c npm install -g coffee-script
goto :eof

:finish
echo.
echo. 安装环境检查结束.
pause