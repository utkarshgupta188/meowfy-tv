import { app, BrowserWindow, dialog, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

import './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkForUpdates() {
  try {
    const currentVersion = app.getVersion();
    const response = await fetch('https://api.github.com/repos/utkarshgupta188/meowfy-tv/releases/latest', {
      headers: {
        'User-Agent': 'MeowfyTV-App'
      }
    });

    if (!response.ok) return;

    const data = await response.json();
    const latestVersion = data.tag_name.replace(/^v|v-/i, ''); // e.g. "v3.3.0" -> "3.3.0"

    if (latestVersion && latestVersion !== currentVersion) {
      const cmp = latestVersion.localeCompare(currentVersion, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp > 0) {
        const { response: btnIndex } = await dialog.showMessageBox({
          type: 'info',
          title: 'Update Available',
          message: `A new version of MeowfyTV (${latestVersion}) is available.\nYou are currently on version ${currentVersion}.\n\nWould you like to download the new version?`,
          buttons: ['Download', 'Later'],
          defaultId: 0,
          cancelId: 1
        });

        if (btnIndex === 0) {
          shell.openExternal(data.html_url);
        } else if (btnIndex === 1) {
          const { response: confirmIndex } = await dialog.showMessageBox({
            type: 'warning',
            title: 'Update Recommended',
            message: 'Are you sure? If you skip this update, some channels or features may not play properly in this version.',
            buttons: ['Download Now', 'I understand'],
            defaultId: 0,
            cancelId: 1
          });

          if (confirmIndex === 0) {
            shell.openExternal(data.html_url);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'MeowfyTV',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3001');
  }, 500);
}

app.whenReady().then(() => {
  createWindow();
  checkForUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
