Start-Process powershell -ArgumentList "cd backend; python main.py" -NoNewWindow
Start-Process powershell -ArgumentList "cd frontend; npm run dev" -NoNewWindow
