const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch (e) {
  // electron-squirrel-startup is optional (Windows only)
}

let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 600,
    height: 500,
    minWidth: 500,
    minHeight: 450,
    maxWidth: 800,
    maxHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1b4b',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    // Uncomment to open DevTools in dev mode:
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// File type filters
const fileFilters = {
  docx: [{ name: 'Word Documents', extensions: ['docx'] }],
  pdf: [{ name: 'PDF Documents', extensions: ['pdf'] }],
  txt: [{ name: 'Text Files', extensions: ['txt'] }],
};

// Handle file save dialog from renderer
ipcMain.handle('save-file', async (event, { buffer, filename }) => {
  // Determine file type from extension
  const ext = path.extname(filename).slice(1).toLowerCase();
  const filters = fileFilters[ext] || [{ name: 'All Files', extensions: ['*'] }];

  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: `Save ${ext.toUpperCase()} File`,
    defaultPath: filename,
    filters: filters
  });

  if (filePath) {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, filePath };
  }
  return { success: false };
});
