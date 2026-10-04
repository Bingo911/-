---
dsl_version: "1.0"
tags: [typing-game, mcp-regression]
defaults:
  timeout_ms: 8000
---
# T1-T4 M9 K1-K4 K11 指法教学与完整练习

## Step 1
```yaml
action: open
url: ${env.base_url}/
```

## Step 2
```yaml
action: click
target:
  description: 形象卡
  css: .pick__item:nth-child(3)
```

## Step 3
```yaml
action: click
target:
  description: 就它了，开始！
  role: button
  name: 就它了，开始！
  exact: true
```

## Step 4
```yaml
action: click
target:
  description: A0
  css: .node:nth-child(1)
```

## Step 5
```yaml
action: click
target:
  description: 先练一练（不限时）
  role: button
  name: 先练一练（不限时）
  exact: true
```

## Step 6
```yaml
action: assert
condition:
  kind: page_contains
  expected: 先认清每根手指管哪些键
```

## Step 7
```yaml
action: click
target:
  description: 先不练，回地图
  role: button
  name: 先不练，回地图
  exact: true
```

## Step 8
```yaml
action: assert
condition:
  kind: page_contains
  expected: 全部 0 / 121 关
```

## Step 9
```yaml
action: click
target:
  description: A1
  css: .node:nth-child(2)
```

## Step 10
```yaml
action: click
target:
  description: 先练一练（不限时）
  role: button
  name: 先练一练（不限时）
  exact: true
```

## Step 11
```yaml
action: assert
condition:
  kind: page_contains
  expected: 先认清每根手指管哪些键
```

## Step 12
```yaml
action: click
target:
  description: 先不练，回地图
  role: button
  name: 先不练，回地图
  exact: true
```

## Step 13
```yaml
action: assert
condition:
  kind: page_contains
  expected: 全部 0 / 121 关
```

## Step 14
```yaml
action: click
target:
  description: A0
  css: .node:nth-child(1)
```

## Step 15
```yaml
action: click
target:
  description: 先练一练（不限时）
  role: button
  name: 先练一练（不限时）
  exact: true
```

## Step 16
```yaml
action: click
target:
  description: 我准备好了，开始练
  role: button
  name: 我准备好了，开始练
  exact: true
```

## Step 17
```yaml
action: assert
condition:
  kind: element_visible
  target:
    description: .hintline
    css: .hintline
```

## Step 18
```yaml
action: assert
condition:
  kind: text_equals
  expected: 0/12
  target:
    description: .play__stat:nth-child(4) b
    css: .play__stat:nth-child(4) b
```

## Step 19
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 20
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 21
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 22
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 23
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 24
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 25
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 26
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 27
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 28
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 29
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 30
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 31
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 32
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 33
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 34
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 35
```yaml
action: assert
condition:
  kind: text_equals
  expected: 12/12
  target:
    description: .play__stat:nth-child(4) b
    css: .play__stat:nth-child(4) b
```

## Step 36
```yaml
action: assert
condition:
  kind: page_contains
  expected: 练习完成，这一局不计星、不解锁
```

## Step 37
```yaml
action: assert
condition:
  kind: page_contains
  expected: +20 积分
```

## Step 38
```yaml
action: screenshot
```

## Step 39
```yaml
action: click
target:
  description: 回到地图
  role: button
  name: 回到地图
  exact: true
```

## Step 40
```yaml
action: assert
condition:
  kind: page_contains
  expected: 0/363
```

## Step 41
```yaml
action: assert
condition:
  kind: page_contains
  expected: 全部 1 / 121 关
```

## Step 42
```yaml
action: click
target:
  description: A1
  css: .node:nth-child(2)
```

## Step 43
```yaml
action: click
target:
  description: 先练一练（不限时）
  role: button
  name: 先练一练（不限时）
  exact: true
```

## Step 44
```yaml
action: assert
condition:
  kind: element_visible
  target:
    description: .play__hud
    css: .play__hud
```

## Step 45
```yaml
action: click
target:
  description: 结束
  role: button
  name: 结束
  exact: true
```

## Step 46
```yaml
action: assert
condition:
  kind: page_contains
  expected: +0 积分
```
