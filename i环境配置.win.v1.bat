@echo off
echo. ��⻷��...
ehco. Ѱ�� node ·����
where node
if %errorlevel% neq 0 goto nonode
ehco. Ѱ�� coffee ·����
where coffee
if %errorlevel% neq 0 call :noCoffee
echo ��װ nodejs ��� :3
start /wait cmd /c npm install
goto finish

:nonode
echo. ���Ȱ�װ NodeJS!
echo. �ٷ���վ: [http://nodejs.org]
echo. �����������������; �����밴 Ctrl+C ǿ���˳�
goto finish

:noCoffee
echo. ��⵽ Nodejs ��������δ���� CoffeeScript ������ 
echo. �����������ʼ��װ; �����밴 Ctrl+C ǿ���˳�
pause>nul
start /wait cmd /c npm install -g coffee-script
goto :eof

:finish
echo.
echo. ��װ����������.
pause