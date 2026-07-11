@echo off
chcp 65001 >nul
title FocusBrain - Lancement
color 0B

echo.
echo  ============================================
echo            FOCUSBRAIN - Demarrage
echo  ============================================
echo.
echo  Demarrage des serveurs, patiente 15 secondes...
echo.

REM --- Demarrer la base de donnees PostgreSQL (locale, portable) ---
"%~dp0pgsql\bin\pg_ctl.exe" status -D "%~dp0pgdata" >nul 2>&1
if errorlevel 1 (
    echo  Demarrage de la base de donnees...
    "%~dp0pgsql\bin\pg_ctl.exe" start -D "%~dp0pgdata" -l "%~dp0pgdata\postgres.log" -w
)

REM --- Demarrer le BACKEND dans une nouvelle fenetre ---
start "FocusBrain - Backend" cmd /k "cd /d %~dp0backend && npm run dev"

REM --- Demarrer le FRONTEND dans une nouvelle fenetre ---
start "FocusBrain - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

REM --- Attendre que les serveurs demarrent ---
timeout /t 15 /nobreak >nul

REM --- Ouvrir l'application dans Edge (voix naturelle) ---
echo  Ouverture de l'application...
start msedge "http://127.0.0.1:5173"

echo.
echo  ============================================
echo   FocusBrain est lance !
echo.
echo   Application : http://127.0.0.1:5173
echo.
echo   NE FERME PAS les 2 fenetres noires
echo   (Backend + Frontend) tant que tu utilises l'app.
echo  ============================================
echo.
echo  Cette fenetre peut etre fermee.
timeout /t 8 /nobreak >nul
