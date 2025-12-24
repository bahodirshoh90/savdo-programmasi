const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// API Server URL - config.json dan o'qiladi yoki default qiymat
function getApiUrl() {
  const configPath = path.join(__dirname, 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.apiUrl || 'http://161.97.184.217/api';
    }
  } catch (e) {
    console.error('Error reading config:', e);
  }
  return 'http://161.97.184.217/api';
}

const API_SERVER_URL = getApiUrl();

let mainWindow;
let adminWindow;
let sellerWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  // Load main menu page
  const menuHtml = `
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Savdo Programma</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        p {
            color: #666;
            margin-bottom: 40px;
            font-size: 1.1em;
        }
        .button-group {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        button {
            padding: 20px 40px;
            font-size: 1.2em;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 600;
            color: white;
        }
        .btn-admin {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .btn-admin:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }
        .btn-seller {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .btn-seller:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(245, 87, 108, 0.4);
        }
        .settings-btn {
            margin-top: 20px;
            padding: 10px 20px;
            font-size: 0.9em;
            background: #6c757d;
        }
        .settings-btn:hover {
            background: #5a6268;
        }
        .icon {
            font-size: 3em;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🏪</div>
        <h1>Savdo Programma</h1>
        <p>Ombor va sotuv boshqaruvi tizimi</p>
        <div class="button-group">
            <button class="btn-admin" onclick="openAdmin()">
                👤 Admin Panel
            </button>
            <button class="btn-seller" onclick="openSeller()">
                🛒 Sotuv Paneli
            </button>
            <button class="settings-btn" onclick="openSettings()">
                ⚙️ Server Sozlamalari
            </button>
        </div>
    </div>
    <script>
        const { ipcRenderer } = require('electron');
        function openAdmin() {
            ipcRenderer.send('open-admin');
        }
        function openSeller() {
            ipcRenderer.send('open-seller');
        }
        function openSettings() {
            ipcRenderer.send('open-settings');
        }
    </script>
</body>
</html>
  `;

  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(menuHtml)}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createAdminWindow() {
  if (adminWindow) {
    adminWindow.focus();
    return;
  }

  adminWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Allow loading external resources
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  // Load admin panel
  const adminPath = path.join(__dirname, 'admin_panel', 'index.html');
  adminWindow.loadFile(adminPath);

  adminWindow.once('ready-to-show', () => {
    adminWindow.show();
    // Open DevTools in development mode
    if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
      adminWindow.webContents.openDevTools();
    }
  });

  adminWindow.on('closed', () => {
    adminWindow = null;
  });
}

function createSellerWindow() {
  if (sellerWindow) {
    sellerWindow.focus();
    return;
  }

  sellerWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Allow loading external resources
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  // Load seller panel
  const sellerPath = path.join(__dirname, 'seller_panel', 'index.html');
  sellerWindow.loadFile(sellerPath);

  sellerWindow.once('ready-to-show', () => {
    sellerWindow.show();
    // Open DevTools in development mode
    if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
      sellerWindow.webContents.openDevTools();
    }
  });

  sellerWindow.on('closed', () => {
    sellerWindow = null;
  });
}

function createSettingsWindow() {
  const settingsWindow = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    resizable: false,
    modal: true,
    parent: mainWindow
  });

  const settingsHtml = `
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>Server Sozlamalari</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 30px;
            background: #f5f5f5;
        }
        h2 {
            margin-bottom: 20px;
            color: #333;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
        }
        button {
            padding: 12px 30px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
        }
        button:hover {
            background: #5568d3;
        }
        .info {
            margin-top: 15px;
            padding: 15px;
            background: #e7f3ff;
            border-radius: 6px;
            color: #0066cc;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <h2>⚙️ Server Sozlamalari</h2>
    <div class="form-group">
        <label for="api-url">API Server URL:</label>
        <input type="text" id="api-url" placeholder="http://161.97.184.217/api" value="${API_SERVER_URL}">
    </div>
    <button onclick="saveSettings()">Saqlash</button>
    <div id="status-message" style="margin-top: 10px; color: green; display: none; font-size: 13px;"></div>
    <div class="info">
        <strong>Eslatma:</strong> Backend server manzilini kiriting. 
        Masalan: http://161.97.184.217/api yoki https://savdo.uztoysshop.uz/api
    </div>
    <script>
        // Load current API URL when window opens
        window.addEventListener('DOMContentLoaded', async () => {
            if (window.electronAPI) {
                try {
                    const currentUrl = await window.electronAPI.getApiUrl();
                    document.getElementById('api-url').value = currentUrl;
                } catch (err) {
                    console.error('Error loading API URL:', err);
                }
            }
        });

        async function saveSettings() {
            const url = document.getElementById('api-url').value.trim();
            const statusDiv = document.getElementById('status-message');
            
            if (!url) {
                statusDiv.textContent = 'Iltimos, API URL ni kiriting!';
                statusDiv.style.color = 'red';
                statusDiv.style.display = 'block';
                return;
            }

            // Validate URL format
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                statusDiv.textContent = 'URL http:// yoki https:// bilan boshlanishi kerak!';
                statusDiv.style.color = 'red';
                statusDiv.style.display = 'block';
                return;
            }

            if (window.electronAPI) {
                try {
                    window.electronAPI.saveApiUrl(url);
                    statusDiv.textContent = 'Sozlamalar saqlandi! Dastur qayta ishga tushiriladi...';
                    statusDiv.style.color = 'green';
                    statusDiv.style.display = 'block';
                    
                    // Wait a bit before restarting
                    setTimeout(() => {
                        window.electronAPI.restartApp();
                    }, 1000);
                } catch (err) {
                    statusDiv.textContent = 'Xatolik: ' + err.message;
                    statusDiv.style.color = 'red';
                    statusDiv.style.display = 'block';
                }
            } else {
                statusDiv.textContent = 'Xatolik: Electron API mavjud emas';
                statusDiv.style.color = 'red';
                statusDiv.style.display = 'block';
            }
        }

        async function testConnection() {
            const url = document.getElementById('api-url').value.trim();
            const statusDiv = document.getElementById('status-message');
            
            if (!url) {
                statusDiv.textContent = 'Iltimos, API URL ni kiriting!';
                statusDiv.style.color = 'red';
                statusDiv.style.display = 'block';
                return;
            }

            statusDiv.textContent = 'Test qilinmoqda...';
            statusDiv.style.color = 'blue';
            statusDiv.style.display = 'block';

            try {
                // Test connection by fetching a simple endpoint
                const testUrl = url.endsWith('/api') ? url + '/products?limit=1' : url + '/products?limit=1';
                const response = await fetch(testUrl, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    statusDiv.textContent = '[OK] Serverga muvaffaqiyatli ulandi!';
                    statusDiv.style.color = 'green';
                    alert('[OK] Serverga muvaffaqiyatli ulandi!');
                } else {
                    statusDiv.textContent = '[XATO] Server javob berdi, lekin xatolik: ' + response.status;
                    statusDiv.style.color = 'orange';
                    alert('[XATO] Server javob berdi, lekin xatolik: ' + response.status);
                }
            } catch (error) {
                const errorMsg = '[XATO] Serverga ulanib bo\'lmadi: ' + error.message;
                statusDiv.textContent = errorMsg;
                statusDiv.style.color = 'red';
                alert(errorMsg);
            }
        }
    </script>
</body>
</html>
  `;

  settingsWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(settingsHtml)}`);
}

// IPC Handlers
ipcMain.on('open-admin', () => {
  createAdminWindow();
});

ipcMain.on('open-seller', () => {
  createSellerWindow();
});

ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

ipcMain.on('save-api-url', (event, url) => {
  const configPath = path.join(__dirname, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({ apiUrl: url }, null, 2));
});

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.exit();
});

ipcMain.handle('get-api-url', () => {
  return getApiUrl();
});

// Disable cache errors (optional, for cleaner console)
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');

// App event handlers
app.whenReady().then(() => {
  createMainWindow();

  // Create application menu
  const template = [
    {
      label: 'Fayl',
      submenu: [
        {
          label: 'Admin Panel',
          accelerator: 'CmdOrCtrl+A',
          click: () => createAdminWindow()
        },
        {
          label: 'Sotuv Paneli',
          accelerator: 'CmdOrCtrl+S',
          click: () => createSellerWindow()
        },
        { type: 'separator' },
        {
          label: 'Chiqish',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Sozlamalar',
      submenu: [
        {
          label: 'Server Sozlamalari',
          click: () => createSettingsWindow()
        }
      ]
    },
    {
      label: 'Yordam',
      submenu: [
        {
          label: 'Haqida',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Savdo Programma',
              message: 'Savdo Programma v1.0.0',
              detail: 'Ombor va sotuv boshqaruvi tizimi\n\nBackend server: ' + API_SERVER_URL
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

