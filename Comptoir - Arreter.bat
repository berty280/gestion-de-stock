@echo off
chcp 65001 >nul
title Arret de Comptoir

echo Arret de Comptoir...
rem Arrete les processus Node (le serveur Comptoir tourne en arriere-plan).
taskkill /F /IM node.exe >nul 2>nul
if errorlevel 1 (
  echo Aucun serveur Comptoir en cours d'execution.
) else (
  echo Comptoir a ete arrete.
)
timeout /t 2 >nul
exit /b 0
