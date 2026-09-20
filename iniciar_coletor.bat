@echo off
rem ===================================================================
rem  Coletor Modbus - SGM Ferroviario (porta 8888)
rem  Inicio automatico no logon, via atalho na pasta Inicializar.
rem  Nao usa o Agendador de Tarefas: esta maquina nao tem acesso de
rem  administrador.
rem ===================================================================

title SGM Coletor Ferroviario
cd /d "%~dp0"

echo Aguardando 30s para a rede subir antes do Modbus e do tunnel...
timeout /t 30 /nobreak >nul

rem Trava contra instancia duplicada.
rem
rem Se um segundo coletor subir, o bind da porta falha dentro de uma
rem thread daemon: o processo continua vivo lendo Modbus normalmente,
rem mas fica surdo a comandos, sem erro visivel em lugar nenhum. E o
rem tipo de falha que so aparece quando alguem precisa acionar um
rem gerador -- entao e melhor nao subir do que subir mudo.
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 8888 -State Listen -ErrorAction SilentlyContinue) { exit 1 }"
if errorlevel 1 (
    echo.
    echo A porta 8888 ja esta em uso: o coletor do Ferroviario ja esta rodando.
    echo Nada a fazer. Esta janela fecha em 10s.
    timeout /t 10 /nobreak >nul
    exit /b 0
)

echo Iniciando coletor do SGM Ferroviario...
"C:\Users\jacques.siman\AppData\Local\Python\bin\python.exe" coletor_modbus.py

rem Se chegou aqui, o coletor caiu. Mantem a janela aberta com o motivo.
echo.
echo ===================================================================
echo  O coletor encerrou. Veja o motivo acima ou em coletor_modbus.log
echo ===================================================================
pause
