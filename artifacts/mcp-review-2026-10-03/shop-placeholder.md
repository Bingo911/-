---
dsl_version: "1.0"
tags: [typing-game, mcp-regression]
defaults:
  timeout_ms: 8000
---
# H1-H4 C6 缺图禁售及角色商店

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
  description: 服装商店
  css: '#topbar button:has-text(''服装商店'')'
```

## Step 5
```yaml
action: assert
condition:
  kind: element_visible
  target:
    description: .fit:nth-child(8)
    css: .fit:nth-child(8)
```

## Step 6
```yaml
action: assert
condition:
  kind: page_contains
  expected: 120 积分
```

## Step 7
```yaml
action: assert
condition:
  kind: element_visible
  target:
    description: .fit:nth-child(2).is-poor
    css: .fit:nth-child(2).is-poor
```

## Step 8
```yaml
action: click
target:
  description: 焰焰
  role: button
  name: 焰焰
  exact: true
```

## Step 9
```yaml
action: assert
condition:
  kind: page_contains
  expected: 立绘还没画好
```

## Step 10
```yaml
action: assert
condition:
  kind: element_visible
  target:
    description: .fit:nth-child(2)
    css: .fit:nth-child(2)
```

## Step 11
```yaml
action: assert
condition:
  kind: page_contains
  expected: 画好才卖
```

## Step 12
```yaml
action: click
target:
  description: 爱莎公主
  role: button
  name: 爱莎公主
  exact: true
```

## Step 13
```yaml
action: assert
condition:
  kind: element_visible
  target:
    description: .fit:nth-child(8) canvas
    css: .fit:nth-child(8) canvas
```

## Step 14
```yaml
action: click
target:
  description: 皮卡丘
  role: button
  name: 皮卡丘
  exact: true
```

## Step 15
```yaml
action: assert
condition:
  kind: element_visible
  target:
    description: .fit:nth-child(8) canvas
    css: .fit:nth-child(8) canvas
```

## Step 16
```yaml
action: screenshot
```

## Step 17
```yaml
action: click
target:
  description: 回到地图
  role: button
  name: 回到地图
  exact: true
```
