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
	# 仅补齐新版本新增的选项，不动已有值
	for opt in advanced auto_apply dual_same_account split_mode \
	           sub1_enabled sub1_dual sub2_enabled sub2_dual sub3_enabled sub3_dual; do
		if ! uci -q get "gdou-srun.gdou_srun.$opt" >/dev/null 2>&1; then
			uci set "gdou-srun.gdou_srun.$opt=0" 2>/dev/null || true
		fi
	done
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