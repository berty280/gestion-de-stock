@echo off
chcp 65001 >nul
title Mise a jour de Comptoir
cd /d "%~dp0"

echo ============================================
echo    Mise a jour de Comptoir
echo ============================================
echo.

where git >nul 2>nul
if errorlevel 1 goto noGit
if not exist ".git" goto noGit

echo [1/4] Arret de Comptoir s'il tourne...
taskkill /F /IM node.exe >nul 2>nul

echo.
echo [2/4] Recuperation de la derniere version...
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BR=%%b"
call git fetch origin
if errorlevel 1 goto erreur
rem Force la version du depot. Les donnees - base, .env - sont ignorees par git : intactes.
call git reset --hard origin/%BR%
if errorlevel 1 goto erreur

echo.
echo [3/4] Mise a jour des dependances...
call npm install
if errorlevel 1 goto erreur

echo.
echo [4/4] Reconstruction de l'application...
call npm run build
if errorlevel 1 goto erreur

rem Mise a jour eventuelle du schema de la base - ne supprime aucune donnee.
call npm run db:migrate

echo.
echo ============================================
echo    Mise a jour terminee !
echo    Double-cliquez sur "Comptoir - Demarrer"
echo ============================================
echo.
pause
exit /b 0

:noGit
echo [INFO] Mise a jour automatique indisponible - git absent ou dossier recupere via ZIP.
echo Pour mettre a jour : retelechargez le ZIP depuis GitHub, bouton vert Code puis Download ZIP,
echo et remplacez le dossier.
echo.
pause
exit /b 0

:erreur
echo.
echo [ERREUR] La mise a jour a echoue. Copiez le message ci-dessus.
echo.
pause
exit /b 1
