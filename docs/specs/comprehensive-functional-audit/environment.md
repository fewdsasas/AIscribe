# 测试环境信息

| 项目 | 值 |
|---|---|
| 检查日期 | 2026-06-28 |
| 操作系统 | Windows 10 Pro for Workstations (2009) |
| Node 版本 | v25.9.0 |
| npm 版本 | 11.12.1 |
| Electron 版本 | v42.4.1 |
| sql.js 版本 | ^1.11.0（package.json） |
| React 版本 | ^18.3.1 |
| TypeScript 版本 | ^5.9.3 |
| 测试数据目录 | `tests/temp/functional-audit-${testId}` |
| 临时项目目录 | `%APPDATA%/AIscribe-test` |
| 工作目录 | `d:\ZhuoMian\Claw\AIscribe` |

## 标准化测试数据集

| 数据类型 | 示例值 |
|---|---|
| 空字符串 | `''` |
| 超长中文名称 | 200 个汉字重复字符串 |
| 超长英文名称 | 500 个英文字母重复字符串 |
| XSS 特殊字符 | `<script>alert('xss')</script>` |
| 引号与换行 | `\"'`、`\n\n\n` |
| emoji | `👍🎉🀄` |
| 有效 API Key | `sk-test1234567890` |
| 无效 API Key（过短） | `invalid-short` |
| 无效 API Key（错误前缀） | `pk-xxxxxxxx` |
| 非法 UUID | `not-a-uuid` |
| 空 UUID | `00000000-0000-0000-0000-000000000000` |
| 损坏文件内容 | 非 JSON 文本、缺失字段 JSON、≥1MB 超大 JSON |
