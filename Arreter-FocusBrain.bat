@echo off
chcp 65001 >nul
title FocusBrain - Arret
echo.
echo  Arret des serveurs FocusBrain...
taskkill /F /IM node.exe >nul 2>&1
echo  Serveurs arretes.
timeout /t 3 /nobreak >nul
