import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error('当前桌面构建脚本仅支持 64 位 Windows')
}

const projectRoot = resolve(import.meta.dirname, '..')
const binaryDirectory = resolve(projectRoot, 'src-tauri', 'binaries')
mkdirSync(binaryDirectory, { recursive: true })
copyFileSync(
  resolve(projectRoot, '..', 'lumora-image-studio-backend', 'target', 'release', 'lumora-server.exe'),
  resolve(binaryDirectory, 'lumora-server-x86_64-pc-windows-msvc.exe'),
)
