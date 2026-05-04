# SpaceX 发射日历

一个基于 Cloudflare Worker 的项目，将 SpaceX 官网的实时发射数据转换为可订阅的公开 ICS 日历，支持 iCloud / Apple Calendar 等日历应用。

## 功能特性

- 在 `/spacex.ics` 发布标准 ICS 日历订阅源
- 在 `/api/launches` 提供结构化的发射数据 JSON 接口
- 提供一个轻量级的落地页，包含日历订阅说明和发射日历视图
- 从 SpaceX 官网的实时数据源拉取数据，而非已停更的 v4 公共 API
- 落地页根据浏览器语言自动切换中英文

## 在线使用

部署到 Cloudflare 并绑定自定义域名后，订阅地址如下：

```text
https://spacex-calendar.mou7s.com/spacex.ics
```

Apple 日历也可以通过 webcal 协议订阅：

```text
webcal://spacex-calendar.mou7s.com/spacex.ics
```

## 数据来源

本项目使用与 SpaceX 官网相同的实时数据源：

- `https://content.spacex.com/api/spacex-website/launches-page-tiles/upcoming` — 任务信息（标题、火箭、发射场等）
- `https://sxcontent9668.azureedge.us/cms-assets/future_missions.json` — 发射时间窗口

## 项目结构

```text
src/
  index.js           Worker 入口和路由处理
  lib/spacex.js      SpaceX 数据规范化和 ICS 生成逻辑
public/
  index.html         落地页
  app.js             前端逻辑和国际化
  styles.css         落地页样式
test/
  spacex.test.js     数据处理和路由测试
wrangler.toml        Cloudflare Worker 配置
```

## 本地开发

安装依赖：

```bash
npm install
```

启动本地开发服务器：

```bash
npm run dev
```

本地服务通常运行在：

```text
http://localhost:8787
```

可用路由：

- `/` — 落地页
- `/spacex.ics` — ICS 日历订阅源
- `/api/launches` — 发射数据 JSON 接口

## 测试

运行自动化测试：

```bash
npm test
```

当前测试覆盖范围：

- SpaceX 双数据源的合并逻辑
- ICS 生成及 `VEVENT` 输出格式验证
- 日历文本转义处理
- Worker 路由行为（`/spacex.ics`）
- 静态资源回退（`/`）

## 部署

部署到 Cloudflare Workers：

```bash
npm run deploy
```

然后在 Cloudflare 控制台为 Worker 绑定自定义域名，例如：

- `spacex-calendar.mou7s.com`

绑定后验证：

```bash
curl -I https://spacex-calendar.mou7s.com/spacex.ics
```

预期响应：

- `200 OK`
- `Content-Type: text/calendar; charset=utf-8`

## 备注

- 本项目仅包含即将执行的发射任务，不包含历史发射记录
- 无需数据库或登录
- 落地页语言根据浏览器自动检测
