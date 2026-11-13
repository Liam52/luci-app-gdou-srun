# 案例：电脑开关机就掉认证

> 这是本项目排查时间最长的一个 bug。记录完整过程，包括**一次错误的归因**，
> 希望能帮到遇到类似问题的 OpenWrt 插件开发者。

## 现象

用户反馈：**笔记本电脑一开机或关机，路由器上的校园网认证就掉线**，而且掉线后
自动重连也经常失败，等几分钟才恢复。

一开始怀疑是插件重连逻辑的问题，但换成旧版守护进程「好像就没这个情况」——
这条线索把排查方向引向了守护进程实现。

## 排查过程

### 第一步：看插件日志

日志里出现了明显的异常节奏：

```
00:25:37 agent boot
00:58:47 agent boot
00:59:19 agent boot     ← 21 秒内又重启一次
01:01:01 agent boot
01:06:28 agent boot
01:06:46 agent boot     ← 18 秒内
01:09:38 agent boot
```

守护进程在反复重启，而且每次重启后都会立刻尝试登录。紧接着日志里出现：

```json
{"detail": "CHALLENGE failed, BAS respond timeout.", "kind": "ac"}
```

`BAS respond timeout` 说明门户的接入控制器（BAS/AC）没有响应——这通常是
**短时间内认证请求过多被限流**的信号。

### 第二步：找到触发源

`/etc/init.d/gdou-srun` 里有一条：

```sh
procd_add_interface_trigger "interface.*" "*" /etc/init.d/gdou-srun reload
```

`interface.*` + `*` 意味着 **任何接口的任何事件**都会重启守护进程。

同时 `/etc/hotplug.d/iface/90-gdou-srun` 里：

```sh
[ "$ACTION" = "ifup" ] || exit 0
( sleep 3; /usr/libexec/gdou-srun login >/dev/null 2>&1 ) &
```

没有判断接口名——**任何接口 `ifup` 都会触发一次登录**。

电脑开机 → LAN 口（eth1）link up → 同时踩中这两条 → 守护进程重启 + 额外一次登录
→ 短时间内 2~3 次认证请求 → 被 BAS 限流。

### 第三步：一次错误的归因（重点）

中途观察到 `dmesg` 里有大量链路翻转：

```
Link is Down: 12 次
Link is Up:   14 次
```

于是判断为「WAN 口 PHY 因供电波动反复复位」，甚至给出了「换独立插座」的建议。

**这个判断是错的。** 错误在于统计口径：

```sh
dmesg | grep -c "Link is Down"        # 12 次  ← 把 LAN 口也算进去了
dmesg | grep -c "eth0: Link is Down"  # 1 次   ← WAN 实际只翻了 1 次
```

那 11 次全部来自 **eth1（LAN 口）**——电脑开关机时网口 up/down 是正常的物理现象，
和 WAN 稳定性毫无关系。

> **教训**：统计内核链路事件必须按接口过滤。`grep "Link is Down"` 会把所有网口
> 混在一起，得出完全错误的结论，还会让人把时间浪费在「供电」这种无关方向上。

### 第四步：验证修复

修复触发器后，让用户重启电脑并观察：

| 指标 | 数值 |
|---|---|
| eth0（WAN）链路翻转 | 1 次 |
| eth1（LAN）链路翻转 | 11 次（电脑开关机，正常） |
| 登录失败 | **0 次** |
| BAS 限流 | **0 次** |
| 认证状态 | **保持在线** |

## 根因

```
电脑开关机
   ↓
eth1（LAN 口）link up/down —— 正常物理现象
   ↓
netifd 产生 LAN 接口事件
   ↓
两个「万能触发器」同时响应：
   ① procd_add_interface_trigger "interface.*" "*"  → 重启守护进程
   ② hotplug：未过滤接口的 ifup → 执行一次登录
   ↓
短时间内多次认证请求
   ↓
校园网 BAS 对该 MAC/IP 限流（CHALLENGE failed, BAS respond timeout）
   ↓
掉认证，且重试持续失败
```

## 修复

### 1. 移除接口触发器

```sh
service_triggers() {
	# 不注册任何自动触发器：
	# - 接口事件会把 LAN 侧电脑开关机当成网络变化，导致无谓重启与重登
	# - 配置 commit 也会触发重载，而插件自己登录成功后就会写配置，形成自重启
	:
}
```

守护进程本身每 3~10 秒探测一次，接口恢复能自行发现，不需要事件驱动。

### 2. hotplug 只对 WAN 生效，并且已在线就跳过

```sh
[ "$ACTION" = "ifup" ] || exit 0

case "$INTERFACE" in
	wan|wan6) ;;
	*) exit 0 ;;
esac

( sleep 3
  /usr/libexec/gdou-srun check >/dev/null 2>&1 && exit 0
  /usr/libexec/gdou-srun login >/dev/null 2>&1
) &
```

### 3. 登录冷却闸门

即使探测失败，也要等满 `login_cooldown`（默认 10 秒）才尝试登录——
链路抖 1~2 秒时根本轮不到登录动作：

```python
if now - self.offline_since < cooldown:
    return
```

### 4. 区分错误类型，限流用长退避

```python
ac_fail = '"kind": "ac"' in detail        # BAS 限流
table = BACKOFF_AC if ac_fail else BACKOFF  # [30,60,120,300] vs [5,10,20,40,60]
```

## 通用建议（给 OpenWrt 插件开发者）

1. **不要用 `interface.*` 通配触发器**。LAN 侧设备的插拔会被当成网络变化，
   引发无谓的重启和重建。要触发就精确到 `interface.wan.*`。
2. **hotplug 脚本必须过滤 `$INTERFACE`**。`ifup` 事件对每个接口都会发，
   包括 loopback、LAN、甚至虚拟接口。
3. **长操作不要阻塞探测循环**。同步、登录、换 IP 这类动作要放后台线程/进程，
   否则探测停摆期间断线也发现不了。
4. **认证类插件要防限流**。门户通常对短时间内多次认证有惩罚，
   失败退避要足够长，而且要把「网络不通」和「被限流」区分开。
5. **统计链路事件按接口过滤**。`grep "Link is"` 会把所有网口混在一起。
6. **诊断包里带上链路翻转计数**，能一眼区分「物理层问题」和「软件问题」：

```
链路翻转 : 本次启动 Link Down 1 次 / Up 2 次
```

## 相关文件

| 文件 | 作用 |
|---|---|
| `files/etc/init.d/gdou-srun` | 服务定义，此处刻意不注册自动触发器 |
| `files/etc/hotplug.d/iface/90-gdou-srun` | WAN 上线时立即认证一次 |
| `files/usr/libexec/gdou-srun-agent` | 常驻守护，含冷却闸门与分类退避 |
| `files/usr/libexec/gdou-srun-diag` | 诊断包，含链路翻转计数 |
