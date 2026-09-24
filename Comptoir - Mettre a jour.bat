@echo off
chcp 65001 >nul
title Mise a jour de Comptoir
cd /d "%~dp0"

echo ============================================
echo    Mise a jour de Comptoir
echo ============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [INFO] git n'est pas installe.
  echo Cette version a ete recuperee via un fichier ZIP.
  echo Pour mettre a jour : retelechargez le ZIP depuis GitHub
  echo (bouton vert "Code" ^> "Download ZIP") et remplacez le dossier.
  echo.
  pause
  exit /b 0
)

if not exist ".git" (
  echo [INFO] Ce dossier n'est pas un depot git (recupere via ZIP).
  echo Retelechargez le ZIP depuis GitHub pour mettre a jour.
  echo.
  pause
  exit /b 0
)

echo [1/4] Arret de Comptoir s'il tourne...
taskkill /F /IM node.exe >nul 2>nul

echo.
echo [2/4] Recuperation de la derniere version...
call git pull
if errorlevel 1 goto erreur

echo.
echo [3/4] Mise a jour des dependances...
call npm install
if errorlevel 1 goto erreur

echo.
echo [4/4] Reconstruction de l'application...
call npm run build
if errorlevel 1 goto erreur

rem Mise a jour eventuelle du schema de la base (ne supprime aucune donnee).
call npm run db:migrate

echo.
echo ============================================
echo    Mise a jour terminee !
echo    Double-cliquez sur "Comptoir - Demarrer.bat"
echo ============================================
echo.
pause
exit /b 0

:erreur
echo.
echo [ERREUR] La mise a jour a echoue. Copiez le message ci-dessus.
echo.
pause
exit /b 1
