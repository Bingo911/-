---
dsl_version: "1.0"
tags: [typing-game, mcp-regression]
defaults:
  timeout_ms: 8000
---
# G3 G5 G9 D1 D7 D7a S3 设置与确认重置

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
  description: 设置
  role: button
  name: 设置
  exact: true
```

## Step 5
```yaml
action: assert
condition:
  kind: page_contains
  expected: 模式：本机保存
```

## Step 6
```yaml
action: click
target:
  description: 容易看的字母开关
  css: '#overlay .row:has-text(''容易看的字母'') button'
```

## Step 7
```yaml
action: assert
condition:
  kind: element_visible
  target:
    description: body.dyslexic
    css: body.dyslexic
```

## Step 8
```yaml
action: click
target:
  description: 护眼提醒档位
  css: '#overlay .row:has-text(''护眼提醒'') button'
```

## Step 9
```yaml
action: assert
condition:
  kind: page_contains
  expected: 45 分钟
```

## Step 10
```yaml
action: click
target:
  description: 清空进度
  role: button
  name: 清空进度
  exact: true
```

## Step 11
```yaml
action: assert
condition:
  kind: page_contains
  expected: 先导出备份
```

## Step 12
```yaml
action: click
target:
  description: 不要清空
  role: button
  name: 不要清空
  exact: true
```

## Step 13
```yaml
action: assert
condition:
  kind: page_contains
  expected: 模式：本机保存
```

## Step 14
```yaml
action: click
target:
  description: 清空进度
  role: button
  name: 清空进度
  exact: true
```

## Step 15
```yaml
action: click
target:
  description: 确定清空
  role: button
  name: 确定清空
  exact: true
```

## Step 16
```yaml
action: assert
condition:
  kind: element_visible
  target:
    description: .pick__item:nth-child(18)
    css: .pick__item:nth-child(18)
```

## Step 17
```yaml
action: open
url: ${env.base_url}/
```

## Step 18
```yaml
action: assert
condition:
  kind: element_visible
  target:
    description: .pick__item:nth-child(18)
    css: .pick__item:nth-child(18)
```

## Step 19
```yaml
action: screenshot
```
