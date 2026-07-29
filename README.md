# 玉衡主题助手（YuHeng）

一个油猴换肤引擎：外壳是「玉衡」（青瓷绿的悬浮控制器 + 面板），内核是 **Dubhe Core**
（注册 / 匹配 / 注入 / 校验），皮肤是可插拔的**主题包**。内置一套 Windows XP Luna
主题，用在 Flarum 论坛上。

[![安装脚本](https://img.shields.io/badge/Install-Userscript-A8CCC0?style=for-the-badge)](https://cdn.jsdelivr.net/gh/Qianshuy99/yuheng@main/dist/yuheng.user.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-59636d?style=for-the-badge)](LICENSE)

![玉衡 · Windows XP 主题](assets/screenshots/home.png)

```
玉衡（外壳 / 管理器）  ──  Dubhe Core（引擎）  ──  主题包（被管理的内容）
   #yh-shell 作用域              store/registry           html.yh-theme-<id> 作用域
   青瓷绿 #A8CCC0                injector/validate        XP 自己是 Luna 蓝
```

## 安装

1. 浏览器装 [Tampermonkey](https://www.tampermonkey.net/)（或 Violentmonkey）。
2. 点上面的安装按钮，或直接打开
   [dist/yuheng.user.js](dist/yuheng.user.js) 的
   [raw 链接](https://cdn.jsdelivr.net/gh/Qianshuy99/yuheng@main/dist/yuheng.user.js)。
3. 访问 https://www.aicue.top/ ，右侧会出现青瓷绿的悬浮球；点开面板选主题。

`Ctrl+Alt+X` 一键开关 XP 主题，油猴菜单里也有开关、开机动画、壁纸命令。

## 内置的 XP 主题都有什么

| | |
| --- | --- |
| ![窗口外壳与首页](assets/screenshots/home.png) | **窗口外壳**：蓝色渐变标题栏（最小化/最大化/关闭）、文件-查看-工具-帮助 菜单栏，论坛 header 变成窗口工具栏。标题栏双击最大化/还原。 |
| ![开始菜单](assets/screenshots/start.png) | **任务栏与开始菜单**：绿色「开始」按钮、任务按钮、托盘（通知/关于/时钟）。开始菜单读当前登录用户的头像与用户名。 |
| ![最小化后的桌面](assets/screenshots/min.png) | **桌面**：最小化后露出壁纸和「我的论坛 / 全部讨论 / 标签 / 回收站」图标，双击可用；右键有 XP 风格菜单。三种壁纸（Bliss 草原用真图，Luna 深蓝与经典纯色是纯 CSS）。 |
| ![讨论页](assets/screenshots/discussion.png) | **讨论页**：`.DiscussionPage-nav`（Scrubber + 回复/关注）做成同一套 XP 任务窗格，Scrubber 轨道点阵底纹；回复框 `.Composer-header` 是从底部升起的 XP 窗口标题栏。 |
| ![玉衡面板](assets/screenshots/panel.png) | **玉衡面板**：本站主题选择、主题设置项、导入/导出、删除导入包。 |
| ![导入对话框](assets/screenshots/import.png) | **导入主题**：粘贴 JSON 或拖文件，过校验后在确认页列出站外域名。 |

其余状态（开机动画、还原、关于框、切换站点框）在 [assets/screenshots/](assets/screenshots/)。

## 快速开始

```bash
npm install
npm run assets     # 可选：重新生成图标与壁纸 base64（需要 Python + Pillow）
npm run build      # → dist/yuheng.user.js，拖进 Tampermonkey 安装
```

开发时：

```bash
npm run preview    # → preview/skin.js，然后浏览器打开 preview/index.html
npm run check      # 无头 Chrome 跑 preview/selfcheck.html，42 项断言
npm run shots      # 无头 Chrome 拍 10 张回归图到 preview/shots/
```

`preview/index.html` 支持 hash 钩子驱动 UI，方便看单个状态：
`#boot` `#start` `#min` `#restore` `#panel` `#import` `#about` `#site`，
加 `?reset` 清空模拟存储回到首次安装状态。

`dist/yuheng.user.js` **入库**（`@downloadURL` 指向仓库里的这个文件，油猴按它更新），
所以改完 `src/` 一定要 `npm run build` 再提交，否则用户装到的还是旧版。
`assets/screenshots/` 里的图是 `npm run shots` 的产物挑出来的，README 引用它们。

## 为什么敢用 `@match *://*/*`

`GM_getValue` 在 Tampermonkey 里是**同步**的，所以 [main.js](src/main.js) 能在
`document-start` 读一次配置、一次主题列表，用 `@match` 模式判断本站有没有主题；
没有就只注册油猴菜单，不碰 DOM、不注入 CSS、不建外壳。没有主题的站点上，整个
脚本的开销就是那两次读取。这个早退是全站匹配能被接受的前提，改元数据前先看
`main.js`。

## 主题契约

CSS-only 包就是这个对象的 JSON 序列化；内置主题多一个 `mount()`。

```js
{
  id: 'xp.luna',                    // 唯一，字母数字与 . _ -
  name: 'Windows XP',
  version: '1.0.0',
  author: 'Qianshuy99',
  match: ['*://*.aicue.top/*'],     // 引擎按此决定是否激活
  runAt: 'start',                   // start | idle
  css: '...',                       // 唯一必需的样式载荷
  vars: { '--xp-bliss': 'url("data:image/jpeg;base64,…")' },
  settings: [{ key: 'boot', type: 'bool', label: '开机动画', default: true }],
  // 以下只有内置主题有，导入包带了会被拒
  mount(ctx) { /* … */ return function teardown() { /* … */ }; },
  onSetting(key, value) { /* 返回 true 表示已就地生效，引擎就不重挂 */ },
}
```

样式作用域约定：主题的 CSS 一律挂在 `html.yh-theme-<id>` 下（id 里的 `.` 换成 `-`），
不要写裸 `:root`/`body` 选择器——`vars` 才是给全局变量用的通道，卸载时随
`<style>` 一起消失。

`mount(ctx)` 拿到的 `ctx`：`settings` `setSetting(k,v)` `toast` `alert` `confirm`
`dialog` `openPanel` `openAbout` `disableTheme()` `log`。

## 存储

| 键 | 内容 |
| --- | --- |
| `yh:config` | `{ enabled, ball, ballPos, activeByHost: {host: themeId}, themeSettings: {themeId: {...}} }` |
| `yh:themes` | 导入的主题包数组 |

`activeByHost[host]` 为空串表示该站点**显式关闭**（与「没选过」区分开）。主题包大
而配置改得频繁，所以分两个键存。旧版 XP 脚本的 `xpw:*` 会在首次运行时一次性迁移
到新 schema 并删除，见 [app.js](src/app.js) 的 `migrateLegacy`。

## 导入的安全边界（v1 只收 CSS）

引擎**绝不 eval 用户内容**。导入包过 [validate.js](src/core/validate.js)：

- 带 `mount`/`unmount`/`script`/`js`/`code` 字段的包直接拒，并明确告诉用户
  「导入的主题不允许携带 JavaScript」——不静默丢弃。
- 拒绝 `@import`（可引入任意远端样式，绕过体积与来源限制）、`expression()`、
  `-moz-binding`、`behavior:url()`、`javascript:`、`data:text/html`。
- 单包 CSS 上限 512 KB，`vars` 总量上限 512 KB（壁纸这类资源靠变量里的 data URI 走）。
- `url()` 指向站外域名**不阻止**，但在确认页列出来：「该主题会向 X 发起请求，可被
  用于记录你的访问」。CSS 拿不到页面数据，但外链请求是一个真实可观测的信道。
- id 与内置主题重名的包会被拒（否则导入包每次都在内置之后注册，会永久顶掉内置主题）。

因为包必须是纯 CSS，壁纸只能以 data URI 随包走，不能用 `@resource`——那样导出的
主题在别人机器上就是空背景。

## 目录

```
src/
  brand.js              常量（名称/版本/色板/图标）唯一来源
  main.js               document-start 入口 + 早退 + GM 菜单
  app.js                控制器：把 store/registry/injector 和外壳缝在一起
  core/
    store.js            GM_* 优先，localStorage 兜底
    log.js              YHLog，banner 只打一次
    registry.js         @match 编译、候选解析、按 host 激活
    injector.js         <style> 注入/卸载
    validate.js         导入包校验与清洗
    env.js              构建期 __YH_PREVIEW__ 标志
    ui/                 ball panel toast loading dialog empty import shell-css dom
  themes/xp/            index.js（mount/unmount）+ theme.css + wallpaper.js
  gen/icons.js          由 gen-assets.py 生成，勿手改
assets/                 logo.png background.jpg 源图 + screenshots/ README 用图
scripts/                build.mjs gen-assets.py shots.mjs selfcheck.mjs
preview/                离线样板 + GM_* mock + 自检页
                        （forum.css 是站点真实样式的一份留档，只给样板当参照）
dist/yuheng.user.js     发布产物（入库，勿手改）
```

## 校验与回归

`npm run check` 打开 [preview/selfcheck.html](preview/selfcheck.html)，覆盖：挂载后
样式/class/DOM 就位；切「不使用主题」后两个 `<style>`、所有 root class、主题 DOM、
`--header-height`、body padding 全部还原；重挂幂等；`activeByHost` 落盘；校验器的
六条拒绝；导出 → 改 id → 再导入 → 切换 → 删除的完整往返。

`npm run shots` 用同一套无头 Chrome 拍 10 张图做视觉回归。两个脚本都用
`.chrome-profile/` 这个一次性 profile，避免和你已开的浏览器抢锁。

CI（[.github/workflows/ci.yml](.github/workflows/ci.yml)）只做一件本地容易忘的事：重新
`npm run build`，比对结果和入库的 `dist/yuheng.user.js` 是否一致。不一致就说明改了
`src/` 却没重新构建，用户会装到旧版。

## 已知取舍

- 真机上 Flarum 若装了额外扩展带来新 DOM，可能还要补几条选择器。
- XP 的窗口 chrome 靠 `position:fixed` + 覆写 `--header-height` 实现「不接管滚动」，
  这些都写在 `theme.css` 里，所以卸载时随 `<style>` 一起消失——不要把它们改成
  行内样式或 JS 赋值，否则关掉主题后 Flarum 的 sticky 侧栏位置会错。
- 站点自带的右下角悬浮「切换站点」胶囊（`#site-switcher-container`）在 closed shadow
  root 里，外部 CSS 进不去，也不能靠 `transform` 造包含块（会把内部 `inset:0` 的弹窗
  压成 0×0），所以整个隐藏，等价入口补在「查看 → 切换站点」和开始菜单里。
