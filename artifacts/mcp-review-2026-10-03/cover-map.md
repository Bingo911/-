---
dsl_version: "1.0"
tags: [typing-game, mcp-regression]
defaults:
  timeout_ms: 8000
---
# C1-C4 M1-M7 封面与解锁地图

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
  css: .pick__item:nth-child(1)
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
action: assert
condition:
  kind: page_contains
  expected: 关于 擎天柱
```

## Step 5
```yaml
action: click
target:
  description: 我知道了
  role: button
  name: 我知道了
  exact: true
```

## Step 6
```yaml
action: assert
condition:
  kind: page_contains
  expected: 全部 0 / 121 关
```

## Step 7
```yaml
action: assert
condition:
  kind: page_contains
  expected: 需要先通过 A4
```

## Step 8
```yaml
action: assert
condition:
  kind: page_contains
  expected: 需要先通过 B4
```

## Step 9
```yaml
action: assert
condition:
  kind: page_contains
  expected: 需要先通过 B18
```

## Step 10
```yaml
action: click
target:
  description: 未解锁的 A2
  css: .node:nth-child(3)
```

## Step 11
```yaml
action: assert
condition:
  kind: page_contains
  expected: 这一关还没解锁
```

## Step 12
```yaml
action: assert
condition:
  kind: page_contains
  expected: 先去把 A1 打出一颗星
```

## Step 13
```yaml
action: click
target:
  description: 好
  role: button
  name: 好
  exact: true
```

## Step 14
```yaml
action: click
target:
  description: A1
  css: .node:nth-child(2)
```

## Step 15
```yaml
action: assert
condition:
  kind: page_contains
  expected: 这一关共 30 条
```

## Step 16
```yaml
action: assert
condition:
  kind: page_contains
  expected: 挑战限时 60 秒
```

## Step 17
```yaml
action: click
target:
  description: 取消
  role: button
  name: 取消
  exact: true
```

## Step 18
```yaml
action: click
target:
  description: 换形象
  css: .topbar__avatar
```

## Step 19
```yaml
action: assert
condition:
  kind: element_visible
  target:
    description: .pick__item.is-sel
    css: .pick__item.is-sel
```

## Step 20
```yaml
action: screenshot
```
