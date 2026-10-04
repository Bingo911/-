---
dsl_version: "1.0"
tags: [typing-game, mcp-regression]
defaults:
  timeout_ms: 8000
---
# K2 K9 K10 K12 K13 H7 A1 挑战暂停与三星通关

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
  description: A1
  css: .node:nth-child(2)
```

## Step 5
```yaml
action: click
target:
  description: 开始挑战
  role: button
  name: 开始挑战
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
  description: 我准备好了，开始练
  role: button
  name: 我准备好了，开始练
  exact: true
```

## Step 8
```yaml
action: click
target:
  description: 暂停
  role: button
  name: 暂停
  exact: true
```

## Step 9
```yaml
action: assert
condition:
  kind: page_contains
  expected: 休息一下
```

## Step 10
```yaml
action: wait
duration_ms: 1000
```

## Step 11
```yaml
action: click
target:
  description: 继续打
  role: button
  name: 继续打
  exact: true
```

## Step 12
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 13
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 14
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 15
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 16
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 17
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 18
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
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
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 36
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 37
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 38
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 39
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 40
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 41
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 42
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 43
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 44
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 45
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 46
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 47
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 48
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 49
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 50
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 51
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 52
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 53
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 54
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 55
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 56
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 57
```yaml
action: click
target:
  description: 下一提示键
  css: .kb-key.is-next
```

## Step 58
```yaml
action: assert
condition:
  kind: text_equals
  expected: 30/30
  target:
    description: .play__stat:nth-child(4) b
    css: .play__stat:nth-child(4) b
```

## Step 59
```yaml
action: assert
condition:
  kind: page_contains
  expected: 过关啦！
```

## Step 60
```yaml
action: screenshot
```

## Step 61
```yaml
action: click
target:
  description: 回到地图
  role: button
  name: 回到地图
  exact: true
```

## Step 62
```yaml
action: assert
condition:
  kind: page_contains
  expected: 3/363
```

## Step 63
```yaml
action: assert
condition:
  kind: element_visible
  target:
    description: .node:nth-child(3):not(.node--locked)
    css: .node:nth-child(3):not(.node--locked)
```

## Step 64
```yaml
action: screenshot
```
