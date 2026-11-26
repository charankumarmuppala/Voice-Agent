$backendUvicorn = "C:\Users\hp\OneDrive\Desktop\voice agent\backend\venv\Scripts\uvicorn.exe"
$backendDir = "C:\Users\hp\OneDrive\Desktop\voice agent\backend"
$frontendDir = "C:\Users\hp\OneDrive\Desktop\voice agent\frontend"

Write-Host "Starting EstateVoice Backend..."
Start-Process -FilePath $backendUvicorn -ArgumentList "app.main:app", "--app-dir", $backendDir, "--host", "127.0.0.1", "--port", "8000", "--reload" -WorkingDirectory $backendDir

Write-Host "Starting EstateVoice Frontend..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173" -WorkingDirectory $frontendDir

Write-Host "Both servers started successfully!"
