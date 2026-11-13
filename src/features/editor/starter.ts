/**
 * 每种语言的默认骨架。
 *
 * 只在**创建房间**的客户端上种一次（见 `useSeedStarter`）：
 * 服务端种会遇到「DO 重启后文档是空的、但客户端手里还有旧内容」的情况，
 * 两边一合并就变成两份骨架。客户端知道自己刚创建房间，种完再进就是唯一真相。
 */
export const STARTER: Record<'java' | 'python' | 'javascript', string> = {
  java: `public class Main {
    public static void main(String[] args) {
        // 在这里写代码，对面能实时看到
        System.out.println("hello, same-screen");
    }
}
`,
  python: `def solve(nums):
    # 在这里写代码，对面能实时看到
    return sorted(nums)


print(solve([3, 1, 2]))
`,
  javascript: `function solve(nums) {
  // 在这里写代码，对面能实时看到
  return [...nums].sort((a, b) => a - b)
}

console.log(solve([3, 1, 2]))
`,
}
