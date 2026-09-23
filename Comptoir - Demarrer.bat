@echo off
chcp 65001 >nul
title Demarrage de Comptoir
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Node.js n'est pas installe. Voir https://nodejs.org
  pause
  exit /b 1
)

rem --- Premiere utilisation : installer/construire si necessaire ---
if not exist "node_modules" (
  echo Premiere utilisation : installation en cours...
  call npm install || goto erreur
)
if not exist "frontend\dist" (
  echo Construction de l'application...
  call npm run build || goto erreur
)
if not exist "backend\.env" copy "backend\.env.example" "backend\.env" >nul
if not exist "backend\data\comptoir.db" (
  echo Initialisation de la base de donnees...
  call npm run db:migrate
  call npm run db:seed
)

rem --- Si Comptoir tourne deja, on ouvre juste le navigateur ---
curl -s -o nul http://localhost:3000/api/health
if not errorlevel 1 (
  start "" http://localhost:3000
  exit /b 0
)

rem --- Lancer le serveur en arriere-plan (fenetre cachee) ---
echo Demarrage de Comptoir en arriere-plan...
> "%TEMP%\comptoir_start.vbs" echo CreateObject("WScript.Shell").Run "cmd /c cd /d ""%CD%"" ^&^& npm run start", 0, False
cscript //nologo "%TEMP%\comptoir_start.vbs" >nul

rem --- Attendre que le serveur reponde, puis ouvrir le navigateur ---
echo Veuillez patienter...
setlocal enabledelayedexpansion
set /a n=0
:attendre
set /a n+=1
curl -s -o nul http://localhost:3000/api/health
if not errorlevel 1 goto pret
if !n! GEQ 40 goto tropLong
>nul ping -n 2 127.0.0.1
goto attendre

:pret
start "" http://localhost:3000
echo Comptoir est demarre. Vous pouvez fermer cette fenetre.
timeout /t 3 >nul
exit /b 0

:tropLong
echo [ERREUR] Le serveur met trop de temps a demarrer.
echo Ouvrez quand meme http://localhost:3000 dans votre navigateur, ou relancez ce fichier.
pause
exit /b 1

:erreur
echo [ERREUR] Echec au demarrage. Copiez le message ci-dessus.
pause
exit /b 1
