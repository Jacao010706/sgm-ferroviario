@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title SGM Ferroviario - Instalador do Coletor

echo.
echo  ================================================
echo    SGM Ferroviario - Instalador do Coletor
echo    Trensurb / Geradores DSE7420 MKII
echo  ================================================
echo.

:: -------------------------------------------------------
:: 1. Verifica/instala Python
:: -------------------------------------------------------
set "PYTHON_EXE="

:: Tenta python no PATH
python --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('where python') do (
        set "PYTHON_EXE=%%i"
        goto :python_ok
    )
)

:: Tenta locais comuns de instalacao sem admin
for %%D in (
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    "%APPDATA%\Python\Python312\Scripts\python.exe"
) do (
    if exist %%D (
        set "PYTHON_EXE=%%~D"
        goto :python_ok
    )
)

:: Precisa instalar
echo [INFO] Python nao encontrado. Baixando Python 3.11.9 (instalacao sem admin)...
echo        Aguarde, pode demorar 1-2 minutos...
echo.
powershell -NoProfile -Command ^
    "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe' -OutFile '$env:TEMP\python-setup.exe' -UseBasicParsing"
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao baixar o Python. Verifique a conexao com a internet.
    pause
    exit /b 1
)

echo [INFO] Instalando Python para o usuario atual (sem precisar de admin)...
"%TEMP%\python-setup.exe" /passive InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_launcher=1
if %errorlevel% neq 0 (
    echo [ERRO] Falha na instalacao do Python.
    pause
    exit /b 1
)

:: Localiza o Python recem instalado
for %%D in (
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
) do (
    if exist %%D (
        set "PYTHON_EXE=%%~D"
        goto :python_ok
    )
)
echo [ERRO] Python instalado mas nao encontrado. Abra um novo terminal e rode novamente.
pause
exit /b 1

:python_ok
echo [OK] Python: %PYTHON_EXE%

:: -------------------------------------------------------
:: 2. Instala dependencias
:: -------------------------------------------------------
echo.
echo [INFO] Instalando dependencias (pymodbus, requests)...
"%PYTHON_EXE%" -m pip install --quiet --upgrade pip
"%PYTHON_EXE%" -m pip install --quiet pymodbus requests
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas.

:: -------------------------------------------------------
:: 3. Copia o coletor
:: -------------------------------------------------------
set "DESTINO=%USERPROFILE%\SGM-Ferroviario"
if not exist "%DESTINO%" mkdir "%DESTINO%"

set "ORIGEM=%~dp0coletor_modbus.py"
if not exist "%ORIGEM%" (
    echo [ERRO] Arquivo coletor_modbus.py nao encontrado em %~dp0
    echo        Certifique-se que coletor_modbus.py esta na mesma pasta que este script.
    pause
    exit /b 1
)

copy /Y "%ORIGEM%" "%DESTINO%\coletor_modbus.py" >nul
echo [OK] coletor_modbus.py copiado para %DESTINO%

:: -------------------------------------------------------
:: 4. Credenciais
:: -------------------------------------------------------
echo.
echo  ------------------------------------------------
echo    Configure as credenciais do coletor SGM
echo    (conta criada pelo administrador do sistema)
echo  ------------------------------------------------
echo.
set /p SGM_EMAIL="  Email (SGM_API_EMAIL)   : "
set /p SGM_PASS="  Senha (SGM_API_PASSWORD): "
echo.

if "%SGM_EMAIL%"=="" (
    echo [ERRO] Email nao pode ser vazio.
    pause
    exit /b 1
)
if "%SGM_PASS%"=="" (
    echo [ERRO] Senha nao pode ser vazia.
    pause
    exit /b 1
)

powershell -NoProfile -Command ^
    "[System.Environment]::SetEnvironmentVariable('SGM_API_EMAIL', '%SGM_EMAIL%', 'User')"
powershell -NoProfile -Command ^
    "[System.Environment]::SetEnvironmentVariable('SGM_API_PASSWORD', '%SGM_PASS%', 'User')"
echo [OK] Variaveis de ambiente definidas.

:: -------------------------------------------------------
:: 5. Cria atalho na Inicializacao (auto-start sem admin)
:: -------------------------------------------------------
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP%\SGM-Coletor.lnk"

powershell -NoProfile -Command ^
    "$ws = New-Object -ComObject WScript.Shell; " ^
    "$s = $ws.CreateShortcut('%SHORTCUT%'); " ^
    "$s.TargetPath = '%PYTHON_EXE%'; " ^
    "$s.Arguments = '%DESTINO%\coletor_modbus.py'; " ^
    "$s.WorkingDirectory = '%DESTINO%'; " ^
    "$s.WindowStyle = 7; " ^
    "$s.Description = 'SGM Ferroviario - Coletor Modbus'; " ^
    "$s.Save()"

if exist "%SHORTCUT%" (
    echo [OK] Auto-inicializacao configurada.
) else (
    echo [AVISO] Nao foi possivel criar atalho de inicializacao. Inicie manualmente.
)

:: -------------------------------------------------------
:: 6. Teste rapido de conexao
:: -------------------------------------------------------
echo.
echo [INFO] Testando conexao com o backend SGM...
"%PYTHON_EXE%" -c ^
    "import requests, os; r = requests.get('https://laudable-peace-production-09cd.up.railway.app/api/v1/health', timeout=10); print('[OK] Backend acessivel:', r.status_code)" ^
    2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Nao foi possivel contatar o backend. Verifique a internet.
)

:: -------------------------------------------------------
:: 7. Inicia o coletor nesta sessao
:: -------------------------------------------------------
echo.
echo  ================================================
echo    Instalacao concluida com sucesso!
echo.
echo    O coletor iniciara automaticamente quando
echo    o usuario 'abb' fizer login.
echo.
echo    Iniciando agora em janela minimizada...
echo  ================================================
echo.

start "SGM-Coletor" /min "%PYTHON_EXE%" "%DESTINO%\coletor_modbus.py"
echo [OK] Coletor iniciado. Verifique o log em:
echo      %DESTINO%\coletor_modbus.log
echo.
echo Pressione qualquer tecla para fechar este instalador.
pause >nul
