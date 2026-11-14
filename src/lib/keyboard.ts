/**
 * 输入法正在组字时按下的 Enter 是「确认候选词」，不是「提交」。
 *
 * 中文/日文输入法里，用户打「张三」按回车是在选字；如果不拦，会直接
 * 触发创建房间 / 加入房间 / 提交画板文字。
 *
 * `isComposing` 是标准判断；Safari 有已知的事件顺序问题
 * （WebKit bug 165004，compositionend 早于 keydown 派发），
 * 那时 isComposing 已经变回 false，所以再补一个 keyCode === 229
 * （VK_PROCESSKEY，组字中的按键）。
 *
 * 参考：modern-web-guidance / ime-safe-enter-submit
 */
type KeyLikeEvent = {
  isComposing?: boolean
  keyCode?: number
}

export function isImeComposing(event: KeyLikeEvent): boolean {
  return event.isComposing === true || event.keyCode === 229
}
