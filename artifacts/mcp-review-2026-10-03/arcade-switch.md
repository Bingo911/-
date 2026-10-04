---
dsl_version: "1.0"
tags: [typing-game, mcp-regression]
defaults:
  timeout_ms: 8000
---
# A1 A5 A6 自由练习四种皮肤与退出

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
  description: 自由练习
  role: button
  name: 自由练习
  exact: true
```

## Step 5
```yaml
action: assert
condition:
  kind: element_visible
  target:
    description: '#scene canvas'
    css: '#scene canvas'
```

## Step 6
```yaml
action: click
target:
  description: 荷叶跳拼音
  role: button
  name: 荷叶跳拼音
  exact: true
```

## Step 7
```yaml
action: assert
condition:
  kind: page_contains
  expected: 荷叶
```

## Step 8
```yaml
action: click
target:
  description: 单词陨石
  role: button
  name: 单词陨石
  exact: true
```

## Step 9
```yaml
action: assert
condition:
  kind: page_contains
  expected: 陨石
```

## Step 10
```yaml
action: click
target:
  description: 古诗飞花
  role: button
  name: 古诗飞花
  exact: true
```

## Step 11
```yaml
action: assert
condition:
  kind: page_contains
  expected: 古诗
```

## Step 12
```yaml
action: screenshot
```

## Step 13
```yaml
action: click
target:
  description: 结束练习
  role: button
  name: 结束练习
  exact: true
```

## Step 14
```yaml
action: assert
condition:
  kind: page_contains
  expected: 古诗飞花 结束
```

## Step 15
```yaml
action: screenshot
```
