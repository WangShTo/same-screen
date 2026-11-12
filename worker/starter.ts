/**
 * 每种语言的默认骨架。
 * 放在 worker 里，由房间在**第一次被打开时**写入：Durable Object 是单实例，
 * 不会出现两个客户端同时判断"空文档"然后各插一份的竞态。
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

export type StarterLang = keyof typeof STARTER
