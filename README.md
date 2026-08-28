# @linxin666/dsh-desktop-launcher (restart-enhanced fork)

> **Fork notice**: this is a local fork of the Apache-2.0 licensed
> [`@linxin666/dsh-desktop-launcher`](https://github.com/zhu1090093659/dsh-web)
> (base version **0.3.4**) with one extra capability: a **one-click restart**
> button next to the floating shutdown button. All upstream credits, license
> and README content remain intact; this fork only *adds* the restart surface.

Create a desktop icon that launches dsh with one double-click: the icon starts
`dsh web` when it is not running, waits for the GUI to become ready, and opens
the browser at the configured URL. Works on Windows (.lnk), macOS (.command)
and Linux (.desktop).

## What it does

- Settings → Plugin configuration → Web UI plugins card with a "Create desktop
  icon" button; the host writes the launcher script under
  `~/.dsh/desktop-launcher/` and places the icon on the Desktop.
- Double-click behavior: probe the GUI URL; if it responds, open the browser
  without starting another process. Otherwise start `dsh web --no-open` in
  the background (hidden on Windows), poll for up to 30 seconds, then let the
  launcher open exactly one browser tab. Closing that tab does not stop the
  backend; use the in-page power button to exit DSH explicitly. If the `dsh`
  command is missing, the launcher shows a message instead of failing silently.
- The launcher is regenerated from the live settings each time you click the
  button, so `dshCommand`, `url` and `profile` changes apply on the next
  creation without editing the icon target.
- Windows launcher and shortcut-installer scripts are written as UTF-8 with a
  BOM for Windows PowerShell 5.1 and non-ASCII user paths. Command lookup
  prefers the npm `dsh.cmd`/executable shim over `dsh.ps1`; a
  PowerShell-script-only fallback is invoked explicitly through
  `powershell.exe` rather than through file association.
- The Windows shortcut uses the DeepSeek Harness whale icon (white background)
  and shows a styled "starting" popup instead of a console window: it reports
  progress (starting dsh, waiting for the GUI) and surfaces failures (missing
  command, timeout) with a Close button.

## Restart enhancement (fork addition)

A circular-arrow **restart** button is rendered next to the floating shutdown
button (bottom-right of the Web UI). It opens a confirm dialog
("Restart DeepSeek Harness") and then POSTs to the loopback-only
`/api/dsh-desktop-launcher/restart` route.

The host half of the route:

1. When the process runs under systemd (default unit `dsh.service`,
   overridable via the `DSH_RESTART_UNIT` environment variable), it executes
   `systemctl restart <unit>` and lets systemd bring dsh back.
2. Otherwise it falls back to a **detached relaunch**: it writes a small
   `dsh-relaunch.cjs` script (under `$DSH_DESKTOP_LAUNCHER_RESTART_DIR` when
   set, else a temp dir) that spawns the same node/dsh command line again,
   then requests a bounded exit (`ctx.appExit`, `process.exit` fallback).

The confirm-before-restart gate is a new settings toggle
(`confirmRestart`, default on) in the plugin settings card.

> ⚠️ Restarting terminates the dsh web process; running sessions and tasks
> are interrupted. The route is loopback-only, like the shutdown route.

## Install

### From this fork (source)

```sh
git clone https://github.com/liuyuyu599com-svg/dsh-desktop-launcher.git
cd dsh-desktop-launcher
pnpm install
pnpm build
# mount as a dsh plugin (see upstream README for the patch/symlink layout)
```

### From npm (upstream, without restart)

```sh
dsh plugin --profile web add @linxin666/dsh-desktop-launcher
```

## Usage

After enabling the plugin in **Settings → Plugin configuration → Web UI
plugins**, use the "Create desktop icon" button, then double-click the icon on
your desktop. The floating power button (bottom-right) exits DSH; the
circular-arrow button next to it restarts DSH.

## License

Apache-2.0. Upstream project:
https://github.com/zhu1090093659/dsh-web
