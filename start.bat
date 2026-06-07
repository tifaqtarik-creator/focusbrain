@echo off
REM FocusBrain - demarrage local en une commande (Windows)
REM Usage : double-cliquer sur start.bat, ou lancer "start.bat" dans le terminal
setlocal

cd /d "%~dp0"

echo ==========================================
echo  FocusBrain - installation et demarrage
echo ==========================================

REM 1. Verifie Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Node.js n'est pas installe. Installe Node 20+ depuis https://nodejs.org puis relance.
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo [OK] Node %%v detecte

REM 2. Fichiers .env
if not exist backend\.env  ( copy backend\.env.example backend\.env >nul  & echo [OK] backend\.env cree )
if not exist frontend\.env ( copy frontend\.env.example frontend\.env >nul & echo [OK] frontend\.env cree )

REM 3. Base de donnees (Docker si dispo)
set DB_READY=0
docker info >nul 2>nul
if not errorlevel 1 (
  echo [...] Demarrage de PostgreSQL via Docker
  docker compose up -d db
  echo [...] Attente que la base soit prete (15s)
  timeout /t 15 /nobreak >nul
  set DB_READY=1
) else (
  echo [ATTENTION] Docker introuvable : la base ne sera pas demarree.
  echo             L'inscription/connexion afficheront "Erreur serveur".
  echo             Installe Docker Desktop ^(https://docker.com^) puis relance.
)

REM 4. Dependances backend + Prisma
echo [...] Installation backend
pushd backend
call npm install
call npx prisma generate
if "%DB_READY%"=="1" (
  echo [...] Application des migrations Prisma
  call npx prisma migrate deploy
)
popd

REM 5. Dependances frontend
echo [...] Installation frontend
pushd frontend
call npm install
popd

REM 6. Demarrage des deux serveurs dans deux fenetres separees
echo [...] Demarrage des serveurs dans deux nouvelles fenetres
start "FocusBrain API"      cmd /k "cd /d %~dp0backend && npm run dev"
start "FocusBrain Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo [PRET] Application lancee !  Ouvre http://localhost:5173 dans ton navigateur.
echo (API backend sur http://localhost:3001)
echo Ferme les deux fenetres pour arreter les serveurs.
pause
