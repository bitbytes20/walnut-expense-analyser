import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { registerAppStateIpc } from './ipc/app-state'
import { registerCategoriesIpc } from './ipc/categories'
import { registerImportIpc } from './ipc/import'
import { registerTransactionsIpc } from './ipc/transactions'
import { registerSecurityIpc } from './ipc/security'
import { SessionLockManager } from './security/session-lock'

process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../renderer')
process.env.PUBLIC = app.isPackaged ? process.env.DIST : join(process.env.DIST_ELECTRON, '../../public')

let mainWindow: BrowserWindow | null = null

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    title: 'Walnut Expense Analyser',
    backgroundColor: '#F5F1E8',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: false
    }
  })

  const sessionLock = new SessionLockManager()
  registerAppStateIpc()
  registerCategoriesIpc()
  registerImportIpc(mainWindow)
  registerTransactionsIpc()
  registerSecurityIpc(mainWindow, sessionLock)
  sessionLock.registerWindow(mainWindow)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await mainWindow.loadFile(join(process.env.DIST!, 'index.html'))
  }
}

app.whenReady().then(async () => {
  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
