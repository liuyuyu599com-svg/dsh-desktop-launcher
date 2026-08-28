# @linxin666/dsh-desktop-launcher（带重启增强的 fork）

> **Fork 声明**：本仓库是 Apache-2.0 协议下
> [`@linxin666/dsh-desktop-launcher`](https://github.com/zhu1090093659/dsh-web)
> （基础版本 **0.3.4**）的本地 fork，新增一项能力：在浮动关机按钮旁边增加
> **一键重启**按钮。上游版权、许可证与 README 内容保持不变，本 fork 只做增量。

双击桌面图标即可一键启动 dsh：图标会在 dsh web 未运行时启动 `dsh web`，
等待 GUI 就绪后自动打开浏览器。支持 Windows（.lnk）、macOS（.command）与
Linux（.desktop）。

## 功能

- 设置 → 插件配置 → Web UI 插件卡片中的「创建桌面图标」按钮；宿主进程将启动
  脚本写入 `~/.dsh/desktop-launcher/` 并把图标放到桌面。
- 双击行为：先探测 GUI 地址；若已响应则直接打开浏览器而不重复启动进程。
  否则后台启动 `dsh web --no-open`（Windows 下隐藏窗口），最多轮询 30 秒，
  然后打开唯一的浏览器标签页。关闭该标签页不会停止后端；请使用页面内的电源
  按钮显式退出 DSH。若找不到 `dsh` 命令，启动器会显示提示而不是静默失败。
- 每次点击「创建桌面图标」都会根据实时设置重新生成启动器，因此
  `dshCommand`、`url`、`profile` 的修改无需编辑图标即可生效。
- Windows 启动器与快捷方式安装脚本以带 BOM 的 UTF-8 写入，兼容 PowerShell 5.1
  与非 ASCII 用户路径；命令查找优先 npm 的 `dsh.cmd` 可执行 shim。
- Windows 快捷方式使用 DeepSeek Harness 鲸鱼图标（白底），启动时显示样式化
  的「启动中」弹窗，报告进度并在失败时给出关闭按钮。

## 重启增强（fork 新增）

Web UI 右下角浮动关机按钮旁新增一个**循环箭头重启按钮**。点击后弹出确认框
（「重启 DeepSeek Harness」），确认后向仅限 loopback 的
`/api/dsh-desktop-launcher/restart` 路由发送 POST。

宿主侧处理逻辑：

1. 进程运行在 systemd 下时（默认单元 `dsh.service`，可通过环境变量
   `DSH_RESTART_UNIT` 覆盖），执行 `systemctl restart <unit>`，由 systemd
   重新拉起 dsh。
2. 否则退化为**分离式重启**：写入一个小型 `dsh-relaunch.cjs` 脚本（优先
   `$DSH_DESKTOP_LAUNCHER_RESTART_DIR`，否则临时目录），用相同命令行重新
   spawn node/dsh，随后请求有界退出（`ctx.appExit`，回退 `process.exit`）。

是否重启前确认由新增的设置项 `confirmRestart`（默认开启）控制，可在插件
设置卡片中修改。

> ⚠️ 重启会终止 dsh web 进程，正在运行的会话与任务会中断。与关机路由一样，
> 该路由仅限 loopback。

## 安装

### 本 fork（源码）

```sh
git clone https://github.com/liuyuyu599com-svg/dsh-desktop-launcher.git
cd dsh-desktop-launcher
pnpm install
pnpm build
# 以 dsh 插件方式挂载（patch/symlink 布局见上游 README）
```

### 上游 npm（无重启功能）

```sh
dsh plugin --profile web add @linxin666/dsh-desktop-launcher
```

## 使用

在 **设置 → 插件配置 → Web UI 插件** 中启用插件后，点击「创建桌面图标」，
再双击桌面图标即可。右下角电源按钮退出 DSH；旁边的循环箭头按钮重启 DSH。

## 许可证

Apache-2.0。上游项目：https://github.com/zhu1090093659/dsh-web
