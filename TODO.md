# SEO 改进清单

> 基于 2026-05-21 SEO 审计结果

## 🔴 高优先级

- [ ] **添加 JSON-LD 结构化数据**
  - 在 `index.html` 的 `<head>` 中嵌入静态 `CollectionPage` 结构化数据
  - JS 加载后动态注入 `Event` 结构化数据（下一次发射任务名、时间、地点等）
  - 有机会在 Google 搜索结果中展示 Rich Results（发射卡片）

- [ ] **添加 `hreflang` 标签**
  - 在 `<head>` 中添加全部 7 种语言的 `rel="alternate" hreflang` 标签
  - 语言：`en`, `zh-CN`, `ja`, `ko`, `es`, `fr`, `de`
  - 包含 `x-default` 指向无语言参数版本

- [ ] **添加 `canonical` URL**
  ```html
  <link rel="canonical" href="https://spacexcalendar.mou7s.com/" />
  ```

## 🟡 中优先级

- [ ] **修复 `html lang` 与初始内容语言不一致**
  - 当前 `<html lang="en">` 但初始标题和描述是中文
  - 改为默认英文，或根据浏览器语言动态设置 `lang` 属性

- [ ] **替换 OG 分享图**
  - 当前用 `icon-512.png`（512×512），社交分享效果差
  - 制作一张 **1200×630px** 的 OG 卡片图

- [ ] **补充 OG 元标签**
  - `og:locale`
  - `og:url`
  - `og:site_name`

- [ ] **统一 OG description 与 meta description 语言**
  - 当前 `meta description` 是中文，`og:description` 是英文
  - 统一为页面当前语言

## 🟢 低优先级（Nice to have）

- [ ] **服务端预渲染关键内容**
  - 在 Worker 端注入下一次发射的名称和时间到初始 HTML
  - 减少 "Loading launch calendar" 状态对搜索引擎的影响

- [ ] **Mission 卡片图片添加 `alt` 文本**
  - 当前使用 JS 动态设置的 background-image，无 `alt`
  - 改为 `<img>` 标签或添加 `role="img"` + `aria-label`

- [ ] **关键资源 `preload`**
  - `preload` 关键 CSS（styles.css）和字体（D-DIN.woff2）
  - 提升 LCP 指标，间接提升 SEO
