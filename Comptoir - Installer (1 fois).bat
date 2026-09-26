@echo off
chcp 65001 >nul
title Installation de Comptoir
cd /d "%~dp0"

echo ============================================
echo    Installation de Comptoir
echo    - a executer une seule fois -
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 goto noNode

echo [1/4] Installation des dependances - peut prendre 1 a 2 minutes...
call npm install
if errorlevel 1 goto erreur

echo.
echo [2/4] Construction de l'application...
call npm run build
if errorlevel 1 goto erreur

echo.
echo [3/4] Configuration...
if not exist "backend\.env" copy "backend\.env.example" "backend\.env" >nul

echo.
echo [4/4] Initialisation de la base de donnees - comptes + produits de demo...
if exist "backend\data\comptoir.db" goto migrateOnly
call npm run db:migrate
call npm run db:seed
goto fini

:migrateOnly
echo Base existante detectee : conservee. Mise a jour du schema uniquement.
call npm run db:migrate
goto fini

:fini
echo.
echo ============================================
echo    Installation terminee !
echo    Double-cliquez maintenant sur
echo    "Comptoir - Demarrer"
echo ============================================
echo.
pause
exit /b 0

:noNode
echo [ERREUR] Node.js n'est pas installe.
echo Installez la version LTS depuis https://nodejs.org puis relancez ce fichier.
echo.
pause
exit /b 1

:erreur
echo.
echo [ERREUR] L'installation a echoue. Copiez le message ci-dessus.
echo.
pause
exit /b 1
