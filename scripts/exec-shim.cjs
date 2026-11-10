// 本机沙箱环境专用：DSH 沙箱禁止子进程用管道捕获输出，
// 而 vite 在 Windows 上会 exec("net use") 探测网络盘 → 直接抛 EPERM。
// 这里把同步抛出的错误吞掉，让 vite 退回默认 realpath。
// 普通开发机不需要这个文件，package.json 的脚本也没有引用它。
const cp = require('node:child_process')

const originalExec = cp.exec

cp.exec = function patchedExec(command, options, callback) {
  try {
    return originalExec.call(this, command, options, callback)
  } catch (error) {
    if (typeof callback === 'function') {
      queueMicrotask(() => callback(error, '', ''))
    }
    return { on: () => undefined, kill: () => undefined }
  }
}
