@echo off
chcp 65001 >nul
title Activer le demarrage automatique de Comptoir
cd /d "%~dp0"

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%STARTUP%\Comptoir (serveur).bat"

echo ============================================
echo    Demarrage automatique de Comptoir
echo ============================================
echo.
echo Comptoir se lancera tout seul a chaque demarrage de Windows.
echo.

rem Cree un petit script de demarrage qui lance le serveur minimise.
> "%TARGET%" echo @echo off
>> "%TARGET%" echo cd /d "%~dp0"
>> "%TARGET%" echo start "Comptoir (serveur - ne pas fermer)" /min cmd /c "npm run start"

if not exist "%TARGET%" goto erreur

echo [OK] Demarrage automatique active.
echo Fichier cree dans le dossier Demarrage de Windows.
echo.
echo Lancement du serveur maintenant...
start "Comptoir (serveur - ne pas fermer)" /min cmd /c "npm run start"

echo.
echo Termine ! Des le prochain demarrage du PC, Comptoir sera pret.
echo Ouvrez ensuite http://localhost:3000 ou double-cliquez sur "Comptoir - Demarrer".
echo.
pause
exit /b 0

:erreur
echo [ERREUR] Impossible de creer le fichier de demarrage automatique.
echo.
pause
exit /b 1
