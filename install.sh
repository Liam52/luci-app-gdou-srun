#!/bin/sh
# luci-app-gdou-srun 免编译安装脚本
#
# 用法（把整个目录传到路由器后执行）：
#   scp -r luci-app-gdou-srun root@192.168.1.1:/tmp/
#   ssh root@192.168.1.1 "sh /tmp/luci-app-gdou-srun/install.sh"
#
# 也可以在路由器上直接跑解压后的目录。
# 特点：不覆盖已有的 /etc/config/gdou-srun，已有账号配置会保留。

set -e

SRC=$(cd "$(dirname "$0")" && pwd)
ROOT=/

say() { printf '%s\n' "$*"; }

# ---------- 1. 依赖 ----------
say "==> 检查 python3"
if ! command -v python3 >/dev/null 2>&1; then
	say "错误：未安装 python3。请先执行："
	say "  opkg update && opkg install python3-light python3-urllib python3-hashlib python3-email"
	exit 1
fi

if [ ! -f "$SRC/files/usr/libexec/gdou-srun" ]; then
	say "错误：找不到 files/ 目录，请在解压后的项目根目录里运行本脚本"
	exit 1
fi

# ---------- 2. 建目录 ----------
say "==> 创建目录"
mkdir -p "$ROOT/etc/config" "$ROOT/etc/init.d" "$ROOT/etc/hotplug.d/iface" \
	"$ROOT/usr/libexec" "$ROOT/usr/share/luci/menu.d" "$ROOT/usr/share/rpcd/acl.d" \
	"$ROOT/www/luci-static/resources/view/gdou-srun" \
	"$ROOT/www/luci-static/resources/gdou-srun"

# ---------- 3. 配置文件（不覆盖已有）----------
if [ -f "$ROOT/etc/config/gdou-srun" ]; then
	say "==> 已存在 /etc/config/gdou-srun，保留现有配置（只补缺失字段）"
	cp -f "$ROOT/etc/config/gdou-srun" "/tmp/gdou-srun.config.bak.$(date +%s)"
	# 补齐当前版本用到的全部选项：只补缺失的，已存在的值一律不动
	for kv in \
		server=http://10.129.1.1 acid=25 manual_acid= last_good_acid= \
		test_host=www.baidu.com test_port=80 \
		interval=1 login_cooldown=10 auto_agree=1 \
		ipv6_mode=off portal_os=HarmonyOS portal_name=Huawei \
		advanced=0 auto_apply=0 dual_same_account=0 split_mode=backup \
		renew_enable=1 renew_gap=5 \
		mac_refresh=0 mac_mode=pool mac_gap=300 mac_origin= \
		sub1_enabled=0 sub1_dual=0 sub2_enabled=0 sub2_dual=0 \
		sub3_enabled=0 sub3_dual=0 \
		sub1_username= sub1_password= sub2_username= sub2_password= \
		sub3_username= sub3_password=; do
		opt=${kv%%=*}
		val=${kv#*=}
		if ! uci -q get "gdou-srun.gdou_srun.$opt" >/dev/null 2>&1; then
			uci set "gdou-srun.gdou_srun.$opt=$val" 2>/dev/null || true
		fi
	done
	# 时刻列表含空格，单独处理
	if ! uci -q get gdou-srun.gdou_srun.renew_times >/dev/null 2>&1; then
		uci set "gdou-srun.gdou_srun.renew_times=0500 1300 2000" 2>/dev/null || true
	fi
	uci commit gdou-srun 2>/dev/null || true
else
	say "==> 写入默认配置"
	cp -f "$SRC/files/etc/config/gdou-srun" "$ROOT/etc/config/gdou-srun"
fi

# ---------- 4. 程序与视图 ----------
say "==> 复制程序"
for f in gdou-srun gdou-srun-apply gdou-srun-daemon gdou-srun-devices \
         gdou-srun-dual gdou-srun-mac gdou-srun-split gdou-srun-status \
         gdou-srun-diag gdou-srun-agent; do
	cp -f "$SRC/files/usr/libexec/$f" "$ROOT/usr/libexec/$f"
	chmod 755 "$ROOT/usr/libexec/$f"
done

say "==> 复制 LuCI 视图"
cp -f "$SRC/files/www/luci-static/resources/view/gdou-srun/home.js"     "$ROOT/www/luci-static/resources/view/gdou-srun/home.js"
cp -f "$SRC/files/www/luci-static/resources/view/gdou-srun/settings.js" "$ROOT/www/luci-static/resources/view/gdou-srun/settings.js"
cp -f "$SRC/files/www/luci-static/resources/view/gdou-srun/advanced.js" "$ROOT/www/luci-static/resources/view/gdou-srun/advanced.js"

say "==> 复制样式表"
cp -f "$SRC/files/www/luci-static/resources/gdou-srun/ui.css" \
	"$ROOT/www/luci-static/resources/gdou-srun/ui.css"

say "==> 复制菜单与权限"
cp -f "$SRC/files/usr/share/luci/menu.d/luci-app-gdou-srun.json" "$ROOT/usr/share/luci/menu.d/luci-app-gdou-srun.json"
cp -f "$SRC/files/usr/share/rpcd/acl.d/luci-app-gdou-srun.json"  "$ROOT/usr/share/rpcd/acl.d/luci-app-gdou-srun.json"

say "==> 复制服务脚本"
cp -f "$SRC/files/etc/init.d/gdou-srun"            "$ROOT/etc/init.d/gdou-srun"
cp -f "$SRC/files/etc/hotplug.d/iface/90-gdou-srun" "$ROOT/etc/hotplug.d/iface/90-gdou-srun"
chmod 755 "$ROOT/etc/init.d/gdou-srun" "$ROOT/etc/hotplug.d/iface/90-gdou-srun"

# ---------- 5. 清缓存并启动 ----------
say "==> 刷新 LuCI 缓存"
rm -rf /tmp/luci-indexcache* /tmp/luci-modulecache 2>/dev/null || true
/etc/init.d/rpcd restart >/dev/null 2>&1 || true

say "==> 启用并启动服务"
if [ -x /etc/init.d/gdou-srun ]; then
	/etc/init.d/gdou-srun enable >/dev/null 2>&1 || true
	/etc/init.d/gdou-srun restart >/dev/null 2>&1 || true
fi

say ""
say "安装完成。"
say "  LuCI 菜单：服务 → 校园网认证"
say "  命令行检查：/usr/libexec/gdou-srun check && echo 在线"
say "  日志：/tmp/gdou-srun.log"
say ""
say "如果菜单没出现，浏览器按 Ctrl+F5，或再执行一次："
say "  rm -rf /tmp/luci-indexcache* && /etc/init.d/rpcd restart"