# SEO Checklist

这个项目换域名后，SEO 的第一目标是让搜索引擎明确：新域名是唯一 canonical 地址，旧域名应该把权重和索引信号迁移过来。先处理迁移和索引基础，再做内容优化。

## 1. 域名迁移

### 旧域名永久重定向到新域名

旧域名所有路径应该用 301 或 308 跳转到新域名的同路径。

```text
https://old.example.com/             -> https://new.example.com/
https://old.example.com/spacex.ics   -> https://new.example.com/spacex.ics
https://old.example.com/calendar.ics -> https://new.example.com/calendar.ics
https://old.example.com/api/launches -> https://new.example.com/api/launches
```

注意：

- 不要只跳首页。
- 不要使用 302 临时跳转。
- 不要形成多级跳转链。
- `/spacex.ics` 和 `/calendar.ics` 也要保留可访问或正确跳转。

## 2. Canonical URL

首页应该声明新域名为 canonical。

```html
<link rel="canonical" href="https://new.example.com/" />
```

如果存在不希望被搜索引擎索引的内部页面，比如 `todo.html`，可以加：

```html
<meta name="robots" content="noindex" />
```

## 3. Sitemap

新增或更新 `/sitemap.xml`，只放希望被索引的 canonical URL。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://new.example.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

如果以后增加真正的公开页面，再把对应页面加入 sitemap。

## 4. Robots.txt

新增或更新 `/robots.txt`。

```text
User-agent: *
Allow: /

Sitemap: https://new.example.com/sitemap.xml
```

如果 `todo.html` 是内部路线图，也可以阻止抓取：

```text
Disallow: /todo.html
```

但更稳妥的是在页面本身加 `noindex`。

## 5. Open Graph 和社交分享

`public/index.html` 里的 Open Graph / Twitter meta 建议使用新域名的绝对 URL。

```html
<meta property="og:url" content="https://new.example.com/" />
<meta property="og:image" content="https://new.example.com/icon-512.png" />
<meta name="twitter:image" content="https://new.example.com/icon-512.png" />
```

检查：

- `og:title`
- `og:description`
- `og:url`
- `og:image`
- `twitter:card`
- `twitter:title`
- `twitter:description`
- `twitter:image`

## 6. 多语言 URL 策略

当前项目使用 `?hl=` 参数切换语言，例如：

```text
/?hl=ja
/?hl=fr
/?hl=de
```

这些页面内容结构基本相同，不建议让搜索引擎把每个 query URL 都当成独立页面索引。建议所有语言参数页面的 canonical 都指向首页：

```text
https://new.example.com/
```

如果以后要认真做多语言 SEO，再改成独立路径：

```text
/en/
/zh-CN/
/ja/
/fr/
```

那时再添加 `hreflang`。

## 7. 页面内容优化

首页应该清楚说明这个工具的核心价值，避免只靠动态数据渲染。

建议自然覆盖这些搜索意图：

- SpaceX launch calendar
- SpaceX launches ICS
- SpaceX calendar subscription
- SpaceX launch schedule calendar

可以补充的静态信息：

- 这是可订阅的 SpaceX 发射 ICS 日历。
- 支持 Apple Calendar、Google Calendar、Outlook 等支持 ICS 订阅的日历应用。
- 数据来自 SpaceX 官网当前使用的实时 feed。
- 提供 `/spacex.ics` 日历订阅源和 `/api/launches` JSON 接口。

不要隐藏关键词，也不要堆砌重复词。

## 8. Search Console

在 Google Search Console 中：

1. 添加新域名 property。
2. 提交 `https://new.example.com/sitemap.xml`。
3. 用 URL Inspection 检查首页。
4. 如果旧域名也在 Search Console 中，使用 Change of Address 工具。
5. 观察 Pages / Indexing 报告里的 redirect、canonical、404 状态。

## 9. 部署后验证

部署后运行：

```bash
curl -I https://new.example.com/
curl -I https://new.example.com/sitemap.xml
curl -I https://new.example.com/robots.txt
curl -I https://new.example.com/spacex.ics
curl -I https://new.example.com/i18n.js
curl -I https://new.example.com/locales/supported.json
```

预期：

- 首页返回 `200`
- `/sitemap.xml` 返回 `200`
- `/robots.txt` 返回 `200`
- `/spacex.ics` 返回 `200` 且 `Content-Type` 是 `text/calendar`
- 静态 JS 和 locale JSON 返回 `200`

如果旧域名仍然可访问：

```bash
curl -I https://old.example.com/
curl -I https://old.example.com/spacex.ics
```

预期：

- 返回 `301` 或 `308`
- `Location` 指向新域名同路径

## 10. 推荐执行顺序

1. 确认新域名是最终要长期使用的域名。
2. 配置旧域名到新域名的永久重定向。
3. 更新 canonical、OG URL、manifest、README 中的域名。
4. 添加 `robots.txt` 和 `sitemap.xml`。
5. 给内部页面加 `noindex`。
6. 部署。
7. 用 `curl -I` 验证关键 URL。
8. 在 Google Search Console 提交 sitemap，并检查索引状态。

