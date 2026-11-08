# Эмулятор Android для проверки мобильной версии в настоящем мобильном Chrome.
# Запуск из PowerShell: ./scripts/emulator.ps1 [адрес]   (по умолчанию боевой сайт)
# Локальная версия с этого ПК: ./scripts/emulator.ps1 http://localhost:3000 (порт пробрасывается через adb reverse).
# Адрес 10.0.2.2 не подходит: по http браузер не считает его защищённым и не сохраняет куку входа (она с флагом secure).
#
# Что делает: запускает виртуальный телефон Dekanat_Pixel (Pixel 7, ширина экрана 360 px),
# ждёт загрузки, открывает адрес в Chrome, проходит экраны первого запуска Chrome
# и пробрасывает отладку Chrome на порт 9222. После этого скрипты проверки работают в эмуляторе:
#   $env:CHROME_REMOTE="http://127.0.0.1:9222"; node scripts/check-nav.mjs <адрес>
#
# Один раз до первого запуска (уже сделано на ПК команды 8 ноября):
#   sdkmanager "system-images;android-35;google_apis_playstore;x86_64"
#   avdmanager create avd -n Dekanat_Pixel -k "system-images;android-35;google_apis_playstore;x86_64" -d pixel_7
#   в config.ini виртуального телефона hw.lcd.density=480 (1080 / 3 = 360 px по ширине) и hw.keyboard=no

param([string]$Url = "https://87.242.100.109.sslip.io")

$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$adb = "$sdk\platform-tools\adb.exe"

if (-not ((& $adb devices) -match "emulator-\d+\s+device")) {
  Start-Process -FilePath "$sdk\emulator\emulator.exe" -ArgumentList "-avd Dekanat_Pixel -no-snapshot-save -no-boot-anim -gpu auto" -WindowStyle Normal
  & $adb wait-for-device
  while ((& $adb shell getprop sys.boot_completed 2>$null) -notmatch "1") { Start-Sleep 2 }
  # В config.ini hw.keyboard=no: на экране полная клавиатура, как на телефоне, так проверяется шторка переписки
}

if ($Url -match "^http://localhost:(\d+)") { & $adb reverse "tcp:$($Matches[1])" "tcp:$($Matches[1])" | Out-Null }
& $adb shell am start -a android.intent.action.VIEW -d $Url -n com.android.chrome/com.google.android.apps.chrome.Main | Out-Null

# Экраны первого запуска Chrome: нажимаем кнопки по тексту, пока не откроется адресная строка
$skip = @("Use without an account", "Accept & continue", "No thanks", "No Thanks", "Got it", "Skip", "More", "Ok, got it",
  "Не входить в аккаунт", "Принять и продолжить", "Нет, спасибо", "Понятно", "Пропустить")
for ($i = 0; $i -lt 10; $i++) {
  Start-Sleep 3
  & $adb shell uiautomator dump /sdcard/ui.xml 2>$null | Out-Null
  $x = (& $adb shell cat /sdcard/ui.xml 2>$null) -join ""
  if ($x -match "url_bar") { break }
  foreach ($m in [regex]::Matches($x, 'text="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')) {
    if ($skip -contains $m.Groups[1].Value) {
      & $adb shell input tap (([int]$m.Groups[2].Value + [int]$m.Groups[4].Value) / 2) (([int]$m.Groups[3].Value + [int]$m.Groups[5].Value) / 2)
      break
    }
  }
}

& $adb forward tcp:9222 localabstract:chrome_devtools_remote | Out-Null
"Эмулятор готов: $Url открыт в Chrome, отладка на http://127.0.0.1:9222"
