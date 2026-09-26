@echo off
chcp 65001 >nul
title Desactiver le demarrage automatique de Comptoir

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%STARTUP%\Comptoir (serveur).bat"

echo Desactivation du demarrage automatique de Comptoir...

if not exist "%TARGET%" goto absent
del "%TARGET%"
echo [OK] Demarrage automatique desactive.
echo Comptoir ne se lancera plus tout seul au demarrage de Windows.
echo (Le serveur actuellement en cours n'est pas arrete : utilisez "Comptoir - Arreter" si besoin.)
echo.
pause
exit /b 0

:absent
echo Le demarrage automatique n'etait pas active. Rien a faire.
echo.
pause
exit /b 0
