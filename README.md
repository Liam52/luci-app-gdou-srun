# luci-app-gdou-srun

广东海洋大学校园网（深澜 / srun 认证）自动登录 —— OpenWrt / LuCI 插件。

> Auto-login for GDOU campus network (srun portal) on OpenWrt, with a LuCI config page, live status bar, scheduled session renewal and optional MAC rotation.

只做一件事：**让路由器开机自动认证，掉线自动重连**。没有测速、没有广告、没有多余功能。

[![GitHub](https://img.shields.io/badge/repo-Liam52%2Fluci--app--gdou--srun-181717?logo=github)](https://github.com/Liam52/luci-app-gdou-srun)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)

> 🤖 **本项目由 AI 辅助开发**（代码 / 文档 / 排错），使用前请阅读文末的 [AI 辅助开发声明](#ai-辅助开发声明)。

---

## 特点

| | |
|---|---|
| **装好就不用管** | procd 守护，默认 1 秒检测一次，掉线自动重连 |
| **ac_id 自动识别** | 从断网时门户劫持的跳转地址里读真实 `ac_id`，不用手动试数字；成功后记住 |
| **自动同意上网协议** | 部分时段门户强制勾选协议，插件自动完成绑定后再登录 |
| **定时重连** | 默认 `0500 / 1300 / 2000` 主动下线，5 秒后自动重登（刷新会话，避免长连接僵死） |
| **联网状态栏** | 页面顶部实时显示 在线 / 离线、WAN 接口、IP、MAC |
| **在线设备列表** | 页面里一张表看清谁连着：主机名、IP、MAC、有线/2.4G/5G、租期，并显示门户侧有几条会话（决定会不会被顶掉） |
| **认证前 MAC 轮换**（可选，默认关） | 5 地址池，登录前换一个，降低被风控的概率 |
| **零重依赖** | 只用 Python 3 标准库，**不需要** requests / jq / curl |
| **手机也能改配置** | 纯 LuCI 表单，改完即时生效，不用重启 |
| **多账号多链路**（可选） | 最多 3 个从账号，含主链路硬上限 4 条；从账号可先填着备用，用不用由开关决定 |
| **单链路控制** | 多链路表格里每条链路都能单独「重连 / 换 MAC-IP / 下线」，互不影响 |

## 界面

`服务 → 校园网认证`，三个标签页：

| 标签 | 内容 |
|---|---|
| **首页** | 顶部状态栏（在线/离线、WAN 接口、IP、MAC）+ 多链路表格（每行可重连/换MAC/下线）+ 校园网在线设备 + 快捷操作 + **下载诊断包** |
| **基础设置** | 账号密码、认证参数、定时重连、检测间隔、ac_id、MAC 轮换、高阶总开关 |
| **高阶设置** | 从账号配置（学号/密码/双链路）、从账号启用（开关）、链路计划预览、批量操作、分流模式 |

<!-- 截图放 docs/ 下后，把下面两行的注释去掉 -->
<!-- ![首页](docs/home.png) -->
<!-- ![高阶设置](docs/advanced.png) -->

## 安装

### 前提

路由器需要 Python 3（约 8 MB）：

```sh
opkg update
opkg install python3-light python3-urllib python3-hashlib python3-email
```

> 如果路由器还没认证上不了网，先用手机热点或电脑共享网络把这一步做完。

### 方式一：单文件脚本（推荐，免编译）

把全部文件塞进一个自包含脚本，传到路由器跑一下就行，不用 scp 整个目录：

```sh
# 1. 生成（在电脑上，项目根目录）
sh tools/make-single-file.sh          # 产出 dist/gdou-router-install.sh

# 2. 传上去执行
scp dist/gdou-router-install.sh root@192.168.1.1:/tmp/
ssh root@192.168.1.1 "sh /tmp/gdou-router-install.sh"
```

也可以直接从 [Releases](https://github.com/Liam52/luci-app-gdou-srun/releases) 下载现成的 `gdou-router-install.sh`。

脚本用 heredoc 写文件（不依赖 base64 / tar），会自己铺文件、注册服务、
**保留旧配置里的账号密码**，跑完就能用。

### 方式二：从源码装

```sh
git clone https://github.com/Liam52/luci-app-gdou-srun.git
scp -r luci-app-gdou-srun root@192.168.1.1:/tmp/
ssh root@192.168.1.1
cd /tmp/luci-app-gdou-srun && sh install.sh
```

### 方式三：编进固件 / 用 SDK

```sh
ln -s "$PWD/luci-app-gdou-srun" /path/to/openwrt/package/luci-app-gdou-srun
make package/luci-app-gdou-srun/compile V=s
```

## 配置

**LuCI → 服务 → 校园网认证**

| 项 | 默认 | 说明 |
|---|---|---|
| 启用自动认证 | 开 | 总开关 |
| 校园网账号 / 密码 | 空 | 学号 + 密码 |
| 启用定时重连 | 开 | 到点主动下线再重登 |
| 重连时刻 | `0500 1300 2000` | 4 位 24 小时制，空格或逗号分隔，可填多个 |
| 下线等待（秒） | 5 | 下线后等多久重新登录 |
| 认证前轮换 MAC | 关 | 见下方「MAC 轮换」 |
| 生成方式 | `pool` | `pool` 固定 5 地址池 / `poolrandom` 每次重建 / `oui` 保留厂商前缀 / `random` 全随机 |
| 轮换最小间隔（秒） | 300 | 两次轮换之间的最短时间，防止刷太快 |
| 检测间隔（秒） | 1 | 多久探测一次联网状态 |
| 认证冷却（秒） | 10 | 两次认证尝试的最短间隔 |
| 手动指定 ac_id | 空 | 填了就只用它，留空自动识别 |
| 兜底 ac_id | 25 | 全都失败时最后试这个 |
| 认证服务器 | `http://10.129.1.1` | 门户地址 |
| 自动同意上网协议 | 开 | 门户要求勾选协议时自动完成 |
| IPv6 模式 | `off` | `off` 完全关闭 / `campus` 仅内网（发地址不发默认路由）/ `full` 完整。详见「IPv6」小节 |
| 设备名 (name) | `Huawei` | 登录时上报给门户的设备名，留空用默认值 |
| 系统名 (os) | `HarmonyOS` | 登录时上报的系统名，留空用默认值 |

> **关于 `os` / `name`**：深澜门户会把这两个字段**原样**记进在线设备列表（`online_device_detail` 里的 `os_name`），管理员查询时能看到。它们没有功能作用，纯粹是设备标识。默认值刻意选了常见手机，避免直接暴露“这是一台路由器”；想改回来随时：
>
> ```sh
> uci set gdou-srun.gdou_srun.portal_os='OpenWrt'
> uci set gdou-srun.gdou_srun.portal_name='OpenWrt'
> uci commit gdou-srun && /etc/init.d/gdou-srun restart
> ```
>
> 改动在**下一次登录**生效（下一次定时重连或手动 `login`）。

### 命令行

```sh
# 交互式输入，避免把示例占位符直接粘进配置
read -r -p "学号: " U
read -r -s -p "密码: " P; echo
uci set gdou-srun.gdou_srun.username="$U"
uci set gdou-srun.gdou_srun.password="$P"
uci commit gdou-srun
/etc/init.d/gdou-srun restart
```

> 注意 UCI 段名是 **`gdou_srun`（下划线）**，配置文件名才是 `gdou-srun`（连字符）。
>
> ⚠️ **不要**把 `'你的密码'` 这种示例文字原样粘进去。曾经发生过：密码被设成字面量 `你的密码`，门户返回 `E2901 ldap_bind error`，看起来像"被学校踢了"，实际是密码错。插件现在会识别常见占位符并直接报配置错误，而不是拿假密码反复撞击门户。

## 高阶设置：多账号与多链路（实验性）

界面是一个菜单项 + 三个标签页（侧边栏点「校园网认证」直接进首页）：

| 标签 | 内容 |
|---|---|
| **首页** | 连接状态（在线/离线、IP、MAC）、账号摘要、校园网在线设备（学校侧计数）、快捷操作（立即认证/下线/重连） |
| **基础设置** | 账号、**双链路聚合**、定时重连、MAC、检测与重试、ac_id、上报标识、手动操作、最底部的「高阶设置」总开关 |
| **高阶设置** | 从账号配置（学号/密码/双链路）与从账号启用（开关）分成两组（每个都带「该账号也开双链路」）、链路计划预览、建立/拆除按钮 |

- **双链路聚合不依赖总开关**：勾选时会弹出确认框（设备额度 / 第二个 MAC-IP / 端口安全 / 可能整机断网），取消则自动取消勾选。
- **从账号与多链路**受总开关 `advanced` 约束：未勾选时后端直接返回空计划，一条链路都不会建。

### 能配什么

| 配置项 | 含义 |
|---|---|
| `advanced` | 总开关，不勾选时以下配置全部不生效，主页面行为与单链路完全一致 |
| `dual_same_account` | 主账号开双链路（两条链路各登录一次，占 2 个设备额度）|
| `sub1_enabled` … `sub3_enabled` | **最多 3 个从账号**，每个独立启停（配置与启用分离，填了不启用也生效） |
| `subN_username` / `subN_password` | 该从账号的凭据 |
| `subN_dual` | 该从账号**单独**开双链路（再占 2 个设备额度）|

```
链路数 = 1（主链路） + 主账号双链路?1:0 + Σ 每个启用的从账号 × (1 + 该账号双链路?1:0)
硬上限：含主链路最多 4 条（超出部分不会建立）
```

**为什么封顶 4 条**：同一账号的多条链路共享一份额度，副链路往往只分到主链路的零头
（实测同账号第二条只有 7~12 Mbps，而跨账号第二条能到 280 Mbps）。条数堆太多不涨速度，
反而增加被门户判定异常的风险。

页面里有一个**链路计划预览**，勾选保存后会实时算出「共 N 条链路、每条用什么账号、落到哪张路由表」，
不用先执行就能看清后果。「从账号配置」里的学号/密码**始终可填**（不再用 `depends` 隐藏），填了不会立即建链；是否真正使用由「从账号启用」那组开关决定。

### 页面上的操作按钮

**首页「多链路」表格里每条链路都有三个按钮**，互不影响：

| 按钮 | 作用 | 等价命令 |
|---|---|---|
| **重连** | 只对这条链路重新认证（清掉下线标记） | `gdou-srun-dual reauth mcvN` |
| **换 MAC/IP** | 换掉该链路的 MAC，重新 DHCP 拿新 IP，再认证 | `gdou-srun-dual refresh mcvN` |
| **下线** | 登出该链路会话并记住，不再自动重登 | `gdou-srun-dual offline mcvN` |

「下线」用标记文件 `/tmp/gdou-off-<链路>` 记录状态，守护进程的 sync 会跳过它——
否则 60 秒后就被自动登录回去了。主链路下线还会写 `/tmp/gdou-srun.pause` 让守护进程整体暂停重登。
点「重连」即可恢复。标记在 `/tmp`，重启路由器自动清除。

高阶设置页另有批量操作：

| 按钮 | 等价命令 |
|---|---|
| 建立全部链路 | `/usr/libexec/gdou-srun-dual up` |
| 全部拆除 | `/usr/libexec/gdou-srun-dual down` |
| 重新认证全部 | `/usr/libexec/gdou-srun-dual reauth` |
| 查看现状 | `/usr/libexec/gdou-srun-dual status` |

### 分流模式

| 模式 | 说明 |
|---|---|
| `off` | 只用主链路 |
| `backup`（**默认**） | 网络备份：平时只用主链路，主链路掉线时整段切到虚拟链路 |
| `conn`（要叠加选它） | 按**新建连接**分流。新连接 50% 走主链路、50% 走虚拟链路，连接内的包不再切换（否则源 IP 变化会断连） |
| `dev` | 按**源设备**分流，同一个设备的流量固定走一条链路 |

改模式：`/usr/libexec/gdou-srun-split on conn|dev`（`off` 用 `gdou-srun-split off`）

> **实现注意**：分流规则用「随机 + 兜底」，兜底规则带 `-m connmark --mark 0x0` 条件。
> 少了这个条件会把随机规则刚打上的标记覆盖掉，导致所有流量压到同一条链路。
> 另外 `sync` 是幂等的——规则没变就不重建分流链，否则重建瞬间的空链会让新连接漏掉打标，
> 从此永久绑死在主链路上。

每条链路独立：自己的 MAC、IP、路由表（`100+N`）与 `ip rule`，**互不影响，也不碰主路由表**；
任一条失败只回滚它自己。日志 `/tmp/gdou-dual.log`。

### 兼容

旧的单从账号字段 `sub_username` / `sub_password` 会被自动迁移到「从账号 1」并启用。

## 校园网在线设备

页面顶部一个窗口（每 10 秒自动刷新，也可手动「刷新」）：一个大数字 + 一张表。

```
  1  台设备在线（学校侧统计）        移动-12个月套餐 · 本机 10.155.236.100

  IP              系统        设备类别   会话 ID
  10.155.236.100    HarmonyOS   Huawei    123456789   [本机]
```

**这才是真正决定你会不会被踢的数字。** 套餐限制同时在线设备数，超了就会把旧会话顶下线；路由器后面挂多少台设备都不计入。数据来自 `rad_user_info` 的 `online_device_total` 与 `online_device_detail`。

- 标 `[本机]` 的那条是这台路由器（按 WAN IP 匹配，不写死）
- 出现你没见过的 IP，说明有别处在用你账号登录（室友的电脑、以前在实验室登过的笔记本），占着你的额度
- 取不到门户数据时（未认证、门户不可达）显示提示，不会让页面报错

命令行等价物（输出里还带着局域网设备信息，方便排查，页面不再展示）：

```sh
/usr/libexec/gdou-srun-devices            # 单行 JSON，含 portal 与 lan 两部分
/usr/libexec/gdou-srun-devices --pretty   # 缩进版
```

## 命令行工具

```sh
/usr/libexec/gdou-srun login      # 立即认证一次
/usr/libexec/gdou-srun check      # 已联网返回 0，否则非 0
/usr/libexec/gdou-srun status     # 最近一次结果（单行 JSON）
/usr/libexec/gdou-srun acid       # 本次会依次尝试哪些 ac_id
/usr/libexec/gdou-srun logout     # 主动下线
/usr/libexec/gdou-srun renew 5    # 下线 5 秒后重新登录

/usr/libexec/gdou-srun-status     # {"online":true,"enabled":true,"mac":"…","ip":"…","dev":"eth0"}
/usr/libexec/gdou-srun-devices    # 设备列表 JSON；加 --pretty 输出缩进版
/usr/libexec/gdou-srun-mac show   # 当前 MAC 与地址池
/usr/libexec/gdou-srun-mac pool-reset
/usr/libexec/gdou-srun-mac refresh
/usr/libexec/gdou-srun-mac restore  # 恢复出厂的原始 MAC
```

## 工作方式

```
procd 启动
   └─ gdou-srun-daemon（每 interval 秒一轮）
        ├─ check：能连通外网？  → 是 → 睡一轮
        └─ 否 →（可选）轮换 MAC → login
                  ├─ 取 challenge → 算 HMAC-MD5 密码 + SHA1 校验
                  ├─ 取协议列表 → 未同意则绑定 → 再登录
                  └─ 成功 → 记录 ac_id → 刷新联网状态栏
接口 ifup/hotplug → 立刻补一次 check
```

认证算法（深澜 srun）：

1. `GET /cgi-bin/get_challenge` 拿 `token` 与客户端 IP
2. 密码 = `HMAC-MD5(token, password)`
3. `info` = 自定义字母表的 Base64（`xEncode` 变体）
4. `chksum` = `SHA1(token + username + token + hmd5 + token + ac_id + token + ip + token + n + token + type + token + info)`
5. 全部塞进 `GET /cgi-bin/srun_portal`，JSONP 回调解析

## ac_id 自动识别

`ac_id` 是接入控制器编号，**按楼栋/区域分配**，路由器换了位置就可能变。插件按可信度依次尝试，去重后最多 4 个：

1. **手动指定**（填了就只用它）
2. **门户劫持跳转里读出来的值** —— 未认证时访问 http 站点会被劫持到门户，跳转 URL 里带着本次连接真实的 `ac_id`
3. **上次成功的值**（成功后记在 `/tmp/gdou-srun.acid`，重启后重新发现也只要 1~2 秒）
4. **兜底值**（默认 25）

## 失败处理

不同原因走不同节奏，避免越试越糟：

| 失败类型 | 处理 |
|---|---|
| `password` 账号或密码错 | 暂停 **30 分钟**，不反复尝试 |
| `rate_limit` 被限流 | 暂停 **3 分钟** |
| `config` 未填账号密码 | 每 **5 分钟**提醒一次 |
| `ac` 该 ac_id 无响应（如 `BAS respond timeout`） | 立刻换下一个 |
| `ip_already_online`（该 IP 已在线） | 视为成功 |
| 其它 | 按检测间隔重试 |

## IPv6（三档，默认关闭）

页面「基础设置 → IPv6」里三选一：

| 模式 | `wan6` | LAN 路由通告 | 适用场景 |
|---|---|---|---|
| `off`（默认） | 关闭 | 关闭 | 外网没有 IPv6 —— 最稳，日志干净 |
| `campus` | 开启 | 发地址、**不发默认路由** | 校内网有 IPv6、外网没有：设备能用 IPv6 访问校内资源，访问外网仍走 IPv4 |
| `full` | 开启 | 正常下发默认路由 | 校内校外都有 IPv6 |

`campus` 的原理是设 `dhcp.lan.ra_default='0'`——LAN 设备会拿到 IPv6 地址（SLAAC），
但收不到 IPv6 默认网关，所以不会把外网流量往 IPv6 上送。

```sh
# 等价命令
uci set gdou-srun.gdou_srun.ipv6_mode='campus'
uci commit gdou-srun && /etc/init.d/gdou-srun restart
```

> **注意**：`campus` 模式要真正有用，路由器得能从 WAN 拿到 IPv6 前缀（DHCPv6-PD 或 RA）。
> 如果 WAN 侧没有 IPv6，LAN 只能拿到路由器的 ULA 地址（`fdfd:...`），校内资源仍访问不到。
> 用 `gdou-srun-diag` 看「IPv6」那一段就能确认。

## MAC 轮换（默认关闭）

有些校园网会按 MAC 做设备数限制或风控。开启后，插件在**每次登录前**把 WAN 口 MAC 换成地址池里的另一个，池子固定 5 个地址，避免每次都变导致 DHCP 反复重新分配。

> ⚠️ **风险提示**：这个功能会改变设备的网络指纹。学校网络的设备数/并发限制通常属于管理规定的一部分，请先确认本校规则允许，再决定是否开启。默认关闭，开启前请自行评估。`gdou-srun-mac restore` 可随时恢复原始 MAC。

### ⚠️ 端口安全：换 MAC 可能直接把口封了

**这是实测踩到的真实故障**（广东海洋大学，2026-11）：接入交换机按 MAC 做端口绑定，换了 MAC 之后端口被**静默封禁**——

| 现象 | 看起来像 | 实际 |
|---|---|---|
| `carrier` 正常、速率 2.5G | 链路是通的 | 物理层通 |
| 收包计数 **0**（能发不能收） | 网络卡了 | 对端一个包都不发 |
| 网关 ARP `FAILED`、门户 `INCOMPLETE` | 认证不上 | L2 已被封 |
| 插件反复报 `Host is unreachable` | 插件坏了 | 端口被交换机禁用了 |

这种故障**没有任何错误提示**，很容易误判成认证逻辑或账号问题。

**已内置保护**：从 v2.0.0 起，`gdou-srun-mac refresh` 换完 MAC 后会校验门户是否可达，
**12 秒内连不上就自动退回原始 MAC**，并输出：

```json
{"ok": false, "reason": "port_security", "restored_to": "aa:bb:cc:dd:ee:ff",
 "msg": "换 MAC 后门户不可达，已自动恢复原始 MAC"}
```

即便如此，**仍建议保持 `mac_refresh=0`**。端口绑定是硬限制，自动保护只能保证"不至于一直断网"，
不能保证换了 MAC 就一定能上网。

> **⚠️ 改了 MAC 但重启后失效？** 检查 `/etc/config/network` 里有没有
> `config device` + `option name 'eth0'` + `option macaddr` 段——**它的优先级高于 interface 上的 `macaddr`**。
> v2.0.0 起插件会同时写这两处，`gdou-srun-mac show` 也会把 device 段的值显示出来。

> **⚠️ `carrier` 不能用来判断网线是否插好**：部分板子（如某些 MT798x + 外置 2.5G PHY 的方案）
> 的 `eth0` 是 `fixed/2500base-x` 固定链路，**MAC 侧 carrier 永远显示 1**，跟网线插没插无关。
> 判断链路是否真的通，要看 `rx_packets` 在几秒内是否增长，或者直接看 DHCP 有没有拿到地址。
> `gdou-srun-diag` 会自动识别这种硬件并在输出里标注。

手动排查/恢复：

```sh
# 看当前 MAC 是否等于原始
cat /sys/class/net/eth0/address
uci get gdou-srun.gdou_srun.mac_origin

# 不一致就恢复
/usr/libexec/gdou-srun-mac restore

# 判断端口是否被封：收包计数在几秒内应明显增长
cat /sys/class/net/eth0/statistics/rx_packets; sleep 4; cat /sys/class/net/eth0/statistics/rx_packets
```

## 日志与排错

### 断网了先点「下载诊断包」

首页最下面的**「下载诊断包」**按钮，会生成一个 `.txt` 直接下载到电脑，内容是：

| 段落 | 用来判断 |
|---|---|
| 配置摘要 | 总开关、分流模式、MAC 轮换是否开启 |
| 接口状态 | `carrier` / `operstate` / `speed` / MAC / IP / 收发计数 |
| **MAC 一致性** | 当前 MAC 与 `mac_origin` 是否相同（不一致多半是被端口绑定封了） |
| **收包活性** | `eth0` 5 秒内收包增量，**为 0 说明对端不发数据** |
| 路由 | 默认路由条数与指向（跑到已断开的接口上会导致 `Network unreachable`） |
| 分流 | `GDSPLIT` 规则和命中计数 |
| 认证状态 | `check` 结果 + 门户返回的原始 JSON |
| 日志 | 插件日志 200 行 + 多链路日志 100 行 + 系统网络日志 40 行 |

一份文件就能看出问题在「认证逻辑」还是在「链路层」，不用再猜。

命令行等价：

```sh
/usr/libexec/gdou-srun-diag > /tmp/diag.txt
```

### 看日志

```sh
tail -f /tmp/gdou-srun.log
logread | grep gdou-srun
```

| 现象 | 排查 |
|---|---|
| 页面打不开 / 没有输入框 | 强制刷新（Ctrl+F5），LuCI 静态资源有版本缓存 |
| 一直 `BAS respond timeout` | `ac_id` 不对，看 `/usr/libexec/gdou-srun acid`，或手动填一个 |
| `Nas type not found` | `ac_id` 不属于本区域，换一个 |
| `E2901 ldap_bind error` | 密码错了（不是账号错） |
| 装了插件但 LuCI 无菜单 | `rm -rf /tmp/luci-indexcache*; /etc/init.d/rpcd restart` |
| `uci: Invalid argument` | 用了 `gdou-srun.gdou_srun` 之外的老段名，见上方“命令行”注 |
| **能连不能上，一直 `Host is unreachable`** | 先查 MAC 是否被换过（见上方「端口安全」）。`rx_packets` 几分钟不增长 = 对端没在发数据（网线/墙口/端口被封），可用 `gdou-srun-diag` 一键取证 |
| 校园网和热点同时在用，认证却失败 | 默认路由被热点抢走了。`ip route show default` 应该是 `via <校园网关> dev eth0`；有两条时给热点接口加 `metric` 让校园网优先 |

## 已知限制

- 必须部署在能访问门户（默认 `10.129.1.1`）的网络里，也就是校园网内
- 路由器需要 Python 3（约 8 MB）
- 学校若限制在线设备数，路由器长期在线会占掉一个名额
- 只适配广东海洋大学当前的门户；同厂商（深澜）的其他学校可改 `server` 与 `ac_id` 试，但不保证
- **部分学校按 MAC 绑定端口**：换 MAC 会导致端口静默封禁（能发不能收）。插件已内置自动回退，但建议不要开 MAC 轮换
- **IPv6 默认关闭**（`ipv6_mode=off`），原因：外网没有 IPv6，给内网下发 IPv6 默认路由会让设备
  优先走 IPv6 访问外网，结果连不上或变慢；而且实测接入的 WAN 口只拿到 `fe80::` 链路本地地址，
  开着只会让 `odhcp6c` 反复报 `Failed to send RS`。校内确实存在 IPv6（部分楼栋/无线），
  想用请切到 `campus` 模式（见下方「IPv6」小节）
- **门户返回 `speed_limit_error` 属正常现象**：广海的移动限速套餐本身就在限速计费组里，
  门户时不时回这个标记，并且**不返回会话详情**（`billing_name` / `all_bytes` / 设备列表全部缺失）。
  只要 `online_ip` 还是你的地址，会话就还在，不代表掉线或账号异常。
  本校实测单连接速度本来就在 50~150 Mbps 区间
- **多链路不等于多带宽**：学校按账号限速，同账号第二条链路通常只能分到零头；跨账号才是真正独立的额度
- **下载速度还受对端 CDN 限制**：实测腾讯/Steam 的 CDN 单连接只给 10~80 Mbps，开多少条链路都改变不了单连接速度
- 硬件加速（MTK HNAT）开启时，约 13% 的新连接会绕过 netfilter 打标，这些连接会固定走主链路；不影响功能，只影响分流比例
- 分流只对**新建连接**生效。改配置或换模式后，已在传输的连接不会重新分配，需重连或等它自然结束

## 目录结构

```
luci-app-gdou-srun/
├── Makefile                              # OpenWrt 包定义（PKG_VERSION 3.1.0）
├── install.sh                            # 免编译安装脚本
├── tools/
│   └── make-single-file.sh               # 生成自包含单文件安装器
├── README.md
├── CHANGELOG.md
├── LICENSE                               # GPL-3.0
├── docs/
│   └── case-lan-hotplug-auth-loss.md     # 案例：电脑开关机掉认证
├── .gitignore / .gitattributes
└── files/
    ├── etc/
    │   ├── config/gdou-srun              # UCI 默认配置
    │   ├── hotplug.d/iface/90-gdou-srun  # 接口 up/down 触发
    │   └── init.d/gdou-srun              # procd 服务（启动 agent）
    ├── usr/libexec/
    │   ├── gdou-srun                     # 认证核心：challenge / login / logout / check
    │   ├── gdou-srun-agent               # 常驻 Python 守护（推荐，CPU 约 1.9%）
    │   ├── gdou-srun-daemon              # 旧 shell 守护（回退用，不随服务启动）
    │   ├── gdou-srun-apply               # 配置变更后整体重建
    │   ├── gdou-srun-status              # 状态查询（首页数据源）
    │   ├── gdou-srun-devices             # 门户在线设备解析
    │   ├── gdou-srun-diag                # 诊断包生成（配置/接口/MAC/路由/日志）
    │   ├── gdou-srun-mac                 # WAN MAC 轮换（含端口安全回退）
    │   ├── gdou-srun-dual                # 多链路：建立/拆除/重连/换MAC/下线
    │   └── gdou-srun-split               # 分流规则（backup / conn / dev）
    ├── usr/share/luci/menu.d/            # 菜单
    ├── usr/share/rpcd/acl.d/             # ACL 权限
    └── www/luci-static/resources/
        ├── gdou-srun/
        │   └── ui.css                    # 三页共用的样式（约 16 KB）
        └── view/gdou-srun/
            ├── home.js                   # 首页：状态 / 账号 / 操作 / 链路 / 设备
            ├── settings.js               # 设置：常用 + 进阶折叠
            └── advanced.js               # 多链路：从账号 / 计划 / 分流 / 批量操作
```

**运行时依赖**：`python3-light`、`python3-urllib`、`python3-hashlib`、`python3-email`。
`gdou-srun`、`gdou-srun-agent`、`gdou-srun-dual`、`gdou-srun-split`、`gdou-srun-devices` 是 Python；
其余是 POSIX shell。

### 提交前注意（Windows 用户）

Windows 上 `git` 默认不记录可执行位，`files/usr/libexec/` 下的脚本推上去会变成 644，
别人从源码构建 opkg 时会装出「不可执行」的脚本。提交前执行一次：

```sh
git update-index --chmod=+x files/usr/libexec/* files/etc/init.d/* files/etc/hotplug.d/iface/*
```

Makefile 里已经加了 `postinst` 兜底（装完补 chmod 755），但仓库本身的权限也建议设对。

## 参与开发

```sh
git clone https://github.com/Liam52/luci-app-gdou-srun.git
cd luci-app-gdou-srun

# 改完后推到你自己的路由器测试（免编译）
scp -r files/* root@192.168.1.1:/
ssh root@192.168.1.1 "/etc/init.d/gdou-srun restart"

# 或编译成 ipk
# 把本目录放进 OpenWrt SDK 的 package/ 下，然后
make package/luci-app-gdou-srun/compile V=s
```

改 LuCI 视图（`*.js`）后记得清缓存，否则看到的还是旧页面：

```sh
rm -rf /tmp/luci-indexcache* && /etc/init.d/rpcd restart
```

提交前请自查：`sh -n` / `python3 -m py_compile` / `node --check` 全部通过，
并且不要把**自己的学号、密码、MAC、内网网段**写进代码或提交记录。

## AI 辅助开发声明

**本项目的代码、文档和排错过程，是在 AI 编程助手的深度参与下完成的。** 这里如实披露，是为了让你在使用前知道自己在用什么。

### 参与范围

| 部分 | 情况 |
|---|---|
| srun 认证核心 | AI 编写，协议字段参考社区公开资料 |
| 多账号 / 多链路 / 分流 | AI 编写，在真机（GDou + MediaTek 路由）上反复实测修正 |
| LuCI 三个页面 | AI 编写 |
| README / CHANGELOG | AI 编写 |
| 故障排查与复盘 | AI 参与分析，包括一次「MAC 轮换导致端口被封」的定位 |

### 这意味着什么

- **代码里可能有 AI 产生的错误**：逻辑偏差、边界情况未覆盖、注释与实现不符、复制粘贴残留
- **「实测通过」只覆盖测过的路径**，不代表所有分支都可靠
- AI 不是责任人，也**没有能力**为任何后果负责

### 因此建议

- 生产使用前**自己读一遍** `files/usr/libexec/` 下的脚本，尤其是会改网络配置的 `gdou-srun-mac`、`gdou-srun-dual`、`gdou-srun-split`
- 不要在有重要业务的网络上直接部署，先在旁路环境验证
- 出问题欢迎提 Issue，但请理解维护者未必能及时响应

### 实测覆盖情况（诚实版）

| 已验证 | 未验证 |
|---|---|
| 认证 / 登出 / 重连 / 定时刷新 | 其他学校的深澜门户（非 GDOU） |
| `ac_id` 自动识别 | 4 条以上链路（已硬性封顶 4） |
| 多链路建立 / 拆除 / 单链路重连 / 换 MAC / 下线 | 数周级长期稳定性 |
| 分流 `conn` / `dev` / `backup` | IPv6 为主的环境 |
| 换 MAC 后的端口安全自动回退 | 非 MediaTek 平台（HNAT 行为不同） |
| 在线设备列表解析 | 门户版本大改后的兼容性 |

## 免责声明

本项目仅用于**自动化你自己账号的认证流程**，不绕过任何身份验证，不获取他人账号，不修改计费数据。使用前请确认符合广东海洋大学校园网管理规定；因使用产生的账号异常、封禁或其他后果由使用者自行承担。

在法律允许的最大范围内，作者与贡献者**不对本项目提供任何明示或暗示的担保**，包括但不限于适销性、特定用途适用性和非侵权性。因使用或无法使用本项目导致的任何直接、间接、附带或后果性损失（含但不限于断网、账号被限制、设备配置被改动），作者与贡献者**不承担责任**。

本项目按 [GPL-3.0](LICENSE) 发布，该许可证本身已包含上述免责条款。

## 许可

[GPL-3.0](LICENSE)

## 致谢

- 深澜 srun 认证流程参考了社区公开的逆向资料
- LuCI / OpenWrt 团队

---

**当前版本**：3.1.0 · 见 [CHANGELOG.md](CHANGELOG.md) 了解每个版本的改动。
