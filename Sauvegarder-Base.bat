@echo off
chcp 65001 >nul
title FocusBrain - Sauvegarde de la base de donnees
color 0A
setlocal enabledelayedexpansion

REM --- Dossier de sauvegarde ---
set "BACKUPDIR=%~dp0sauvegardes"
if not exist "%BACKUPDIR%" mkdir "%BACKUPDIR%"

REM --- Horodatage AAAA-MM-JJ_HHMM ---
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set "STAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%h%dt:~10,2%"

echo.
echo  ============================================
echo     FOCUSBRAIN - SAUVEGARDE BASE DE DONNEES
echo  ============================================
echo.

REM --- 1) Base LOCALE (si elle tourne) ---
"%~dp0pgsql\bin\pg_ctl.exe" status -D "%~dp0pgdata" >nul 2>&1
if errorlevel 1 (
    echo  [LOCAL]  Base locale eteinte - demarrage temporaire...
    "%~dp0pgsql\bin\pg_ctl.exe" start -D "%~dp0pgdata" -l "%~dp0pgdata\postgres.log" -w >nul
    set "STOPAFTER=1"
)
echo  [LOCAL]  Sauvegarde en cours...
"%~dp0pgsql\bin\pg_dump.exe" -U postgres -d focusbrain -Fc -f "%BACKUPDIR%\focusbrain-LOCAL-%STAMP%.dump"
if errorlevel 1 (
    echo  [LOCAL]  ECHEC de la sauvegarde locale !
) else (
    echo  [LOCAL]  OK : focusbrain-LOCAL-%STAMP%.dump
)
if defined STOPAFTER (
    "%~dp0pgsql\bin\pg_ctl.exe" stop -D "%~dp0pgdata" -m fast >nul 2>&1
)

echo.

REM --- 2) Base EN LIGNE (Render) - necessite le fichier url-base-en-ligne.txt ---
if exist "%BACKUPDIR%\url-base-en-ligne.txt" (
    set /p PRODURL=<"%BACKUPDIR%\url-base-en-ligne.txt"
    echo  [RENDER] Sauvegarde de la base en ligne...
    "%~dp0pgsql\bin\pg_dump.exe" "!PRODURL!" -Fc -f "%BACKUPDIR%\focusbrain-RENDER-%STAMP%.dump"
    if errorlevel 1 (
        echo  [RENDER] ECHEC ! Verifiez l'URL dans sauvegardes\url-base-en-ligne.txt
    ) else (
        echo  [RENDER] OK : focusbrain-RENDER-%STAMP%.dump
    )
) else (
    echo  [RENDER] Ignoree : fichier sauvegardes\url-base-en-ligne.txt absent.
    echo           Collez-y l'External Database URL de Render pour l'activer.
)

echo.
echo  ============================================
echo   Sauvegardes dans le dossier : sauvegardes\
echo  ============================================
echo.
pause
