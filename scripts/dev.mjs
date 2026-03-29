import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import electronPath from 'electron'
import * as esbuild from 'esbuild'
import { createServer } from 'vite'

const rootDir = process.cwd()
const outMain = resolve(rootDir, 'out/main/index.cjs')
const outPreload = resolve(rootDir, 'out/preload/index.cjs')

const external = [
  'electron',
  'better-sqlite3',
  'drizzle-orm',
  'drizzle-orm/*',
  '@node-rs/argon2',
  '@node-rs/argon2-*'
]

let electronProcess
let shutdownStarted = false
let restartTimer
const desktopMode = process.env.WALNUT_DEV_DESKTOP === '1'

const killElectron = () =>
  new Promise((resolveKill) => {
    if (!electronProcess || electronProcess.killed) {
      electronProcess = undefined
      resolveKill()
      return
    }

    electronProcess.once('exit', () => {
      electronProcess = undefined
      resolveKill()
    })
    electronProcess.kill()
  })

const startElectron = (rendererUrl) => {
  console.log(`[dev] launching Electron with ${rendererUrl}`)
  electronProcess = spawn(electronPath, [outMain], {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: rendererUrl
    }
  })

  electronProcess.on('exit', (code) => {
    if (shutdownStarted) {
      return
    }
    if (code && code !== 0) {
      console.error(`Electron exited with code ${code}.`)
    }
  })
}

const scheduleElectronRestart = (rendererUrl) => {
  if (shutdownStarted) {
    return
  }
  clearTimeout(restartTimer)
  restartTimer = setTimeout(async () => {
    if (!existsSync(outMain) || !existsSync(outPreload)) {
      return
    }
    await killElectron()
    startElectron(rendererUrl)
  }, 150)
}

const waitForOutputs = async () => {
  const started = Date.now()
  while (!existsSync(outMain) || !existsSync(outPreload)) {
    if (Date.now() - started > 15000) {
      throw new Error('Timed out waiting for main/preload dev bundles.')
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100))
  }
}

const withRestartPlugin = (name, rendererUrl) => ({
  name: `restart-electron-on-${name}-rebuild`,
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length === 0) {
        scheduleElectronRestart(rendererUrl)
      }
    })
  }
})

const mainConfig = (rendererUrl) => ({
  entryPoints: ['src/main/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: outMain,
  external,
  plugins: [withRestartPlugin('main', rendererUrl)]
})

const preloadConfig = (rendererUrl) => ({
  entryPoints: ['src/preload/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: outPreload,
  external: ['electron'],
  plugins: [withRestartPlugin('preload', rendererUrl)]
})

const shutdown = async (viteServer, mainContext, preloadContext) => {
  if (shutdownStarted) {
    return
  }
  shutdownStarted = true
  clearTimeout(restartTimer)
  await Promise.allSettled([
    killElectron(),
    viteServer?.close(),
    mainContext?.dispose(),
    preloadContext?.dispose()
  ])
}

const run = async () => {
  const viteServer = await createServer({
    configFile: resolve(rootDir, 'electron.vite.config.ts'),
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: false
    },
    appType: 'spa'
  })

  await viteServer.listen()
  const rendererUrl = viteServer.resolvedUrls?.local?.[0] ?? 'http://127.0.0.1:5173/'
  console.log(`[dev] renderer ready at ${rendererUrl}`)

  if (!desktopMode) {
    console.log('[dev] browser harness mode is active')
    console.log('[dev] run `npm run dev:electron` when you want to try the native desktop shell')

    const handleSignal = async () => {
      await shutdown(viteServer)
      process.exit(0)
    }

    process.on('SIGINT', handleSignal)
    process.on('SIGTERM', handleSignal)
    return
  }

  const mainContext = await esbuild.context(mainConfig(rendererUrl))
  const preloadContext = await esbuild.context(preloadConfig(rendererUrl))

  await Promise.all([mainContext.watch(), preloadContext.watch()])
  await Promise.all([mainContext.rebuild(), preloadContext.rebuild()])
  await waitForOutputs()
  console.log('[dev] main and preload watchers ready')
  startElectron(rendererUrl)

  const handleSignal = async () => {
    await shutdown(viteServer, mainContext, preloadContext)
    process.exit(0)
  }

  process.on('SIGINT', handleSignal)
  process.on('SIGTERM', handleSignal)
}

run().catch(async (error) => {
  console.error(error)
  process.exit(1)
})
