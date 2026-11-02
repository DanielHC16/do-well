$env:EXPO_PUBLIC_APP_RUNTIME = 'demo'
$env:EXPO_NO_TELEMETRY = '1'
$env:CI = '1'
Set-Location 'C:\Users\Hardy\ObsidianVaults\Atom\projects\DO-WELL'
& npx.cmd expo start --dev-client --localhost --port 8082
