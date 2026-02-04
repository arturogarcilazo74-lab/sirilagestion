const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = !app.isPackaged; // Simple check

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        icon: path.join(__dirname, '../public/logo escuela.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false, // ¡CRUCIAL! Esto permite que los archivos locales se carguen sin bloqueos
            allowRunningInsecureContent: true
        },
    });

    // Abrir automáticamente la consola si hay un error al cargar
    win.webContents.on('did-fail-load', () => {
        win.webContents.openDevTools();
    });

    // For debugging: Open DevTools with Ctrl+Shift+I
    win.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            win.webContents.openDevTools();
        }
    });

    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        // --- LA SOLUCIÓN DEFINITIVA PARA ASAR ---
        const indexPath = path.join(__dirname, '..', 'dist-app', 'index.html');

        console.log("Intentando cargar:", indexPath);

        win.loadFile(indexPath).catch(err => {
            win.loadFile(path.join(__dirname, 'dist-app', 'index.html')).catch(() => {
                win.loadFile(path.join(app.getAppPath(), 'dist-app', 'index.html')).catch(finalErr => {
                    win.webContents.openDevTools();
                    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
                        <body style="background:#1e293b; color:white; font-family:sans-serif; padding:50px;">
                            <h1 style="color:#f87171;">❌ No se encontró el Archivo</h1>
                            <p>Buscamos en la nueva ruta segura: <b>dist-app</b></p>
                            <p>Error: ${finalErr.message}</p>
                            <hr>
                            <p>Presiona <b>Ctrl+R</b> para reintentar.</p>
                        </body>
                    `)}`);
                });
            });
        });
    }

    win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
