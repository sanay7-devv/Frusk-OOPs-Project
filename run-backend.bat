@echo off
setlocal enabledelayedexpansion

REM Load environment variables from backend\.env
if exist "%~dp0backend\.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0backend\.env") do (
        set "line=%%A"
        if not "!line:~0,1!"=="#" (
            if not "%%A"=="" (
                set "%%A=%%B"
            )
        )
    )
    echo Loaded environment variables from backend\.env
)

cd /d "%~dp0backend"
call mvnw.cmd spring-boot:run
