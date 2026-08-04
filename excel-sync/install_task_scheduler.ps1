# Marder Ciftlik - Excel senkronizasyonunu Windows Gorev Zamanlayici'ya
# gunde iki kez (07:00 ve 19:00) calisacak sekilde kaydeder.
#
# Kullanim: bu klasorde (excel-sync) sag tik -> "PowerShell ile calistir"
# ya da bir PowerShell penceresinde:
#     powershell -ExecutionPolicy Bypass -File install_task_scheduler.ps1

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $pythonExe) {
    $pythonExe = (Get-Command py -ErrorAction SilentlyContinue).Source
}
if (-not $pythonExe) {
    Write-Host "HATA: Python bulunamadi. Once Python 3'u kurun (python.org) ve tekrar deneyin." -ForegroundColor Red
    exit 1
}

$configPath = Join-Path $scriptDir "config.json"
if (-not (Test-Path $configPath)) {
    Write-Host "HATA: $configPath bulunamadi." -ForegroundColor Red
    Write-Host "Once config.example.json dosyasini config.json olarak kopyalayip kendi bilgilerinizi girin." -ForegroundColor Yellow
    exit 1
}

$taskName = "MarderCiftlik-ExcelSenkron"
$syncScript = Join-Path $scriptDir "sync.py"

$action = New-ScheduledTaskAction -Execute $pythonExe -Argument "`"$syncScript`"" -WorkingDirectory $scriptDir

$trigger1 = New-ScheduledTaskTrigger -Daily -At 07:00
$trigger2 = New-ScheduledTaskTrigger -Daily -At 19:00

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -WakeToRun `
    -DontStopOnIdleEnd `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
    -RestartCount 2 `
    -RestartInterval (New-TimeSpan -Minutes 5)

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger @($trigger1, $trigger2) `
    -Settings $settings `
    -Description "Buzagi tedavileri Excel <-> Marder Ciftlik sitesi senkronizasyonu (gunde 2 kez)." `
    | Out-Null

Write-Host ""
Write-Host "Gorev basariyla olusturuldu: '$taskName'" -ForegroundColor Green
Write-Host "Her gun 07:00 ve 19:00'da calisacak." -ForegroundColor Green
Write-Host ""
Write-Host "NOT: Bu gorev sadece bilgisayarda oturum acikken calisir." -ForegroundColor Yellow
Write-Host "Simdi elle bir kez test etmek icin Gorev Zamanlayici'yi acip" -ForegroundColor Yellow
Write-Host "'$taskName' gorevine sag tikla -> Calistir diyebilirsiniz." -ForegroundColor Yellow
