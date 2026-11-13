#!/bin/sh
# 把整个插件打包成一个自包含的安装脚本（dist/gdou-router-install.sh）。
#
# 用法：
#   sh tools/make-single-file.sh
#
# 产物：dist/gdou-router-install.sh
#   上传到路由器后 `sh gdou-router-install.sh` 即可，不需要 scp 整个目录，
#   也不依赖 base64 / tar（用 heredoc 直接写文件），OpenWrt 的 busybox sh 能跑。

set -e

SRC=$(cd "$(dirname "$0")/.." && pwd)
OUT="$SRC/dist/gdou-router-install.sh"
MARK="__GDOU_FILE_EOF__"

mkdir -p "$SRC/dist"

# 需要打包的文件（相对 files/ 的路径）
FILES="
etc/config/gdou-srun
etc/init.d/gdou-srun
etc/hotplug.d/iface/90-gdou-srun
usr/libexec/gdou-srun
usr/libexec/gdou-srun-apply
usr/libexec/gdou-srun-daemon
usr/libexec/gdou-srun-devices
usr/libexec/gdou-srun-dual
usr/libexec/gdou-srun-mac
usr/libexec/gdou-srun-split
usr/libexec/gdou-srun-status
usr/libexec/gdou-srun-diag
usr/libexec/gdou-srun-agent
usr/share/luci/menu.d/luci-app-gdou-srun.json
usr/share/rpcd/acl.d/luci-app-gdou-srun.json
www/luci-static/resources/gdou-srun/ui.css
www/luci-static/resources/view/gdou-srun/home.js
www/luci-static/resources/view/gdou-srun/settings.js
www/luci-static/resources/view/gdou-srun/advanced.js
"

{
	cat <<'HEADER'
#!/bin/sh
# luci-app-gdou-srun —— 单文件安装脚本（自动生成，请勿手动编辑）
#
# 源码与生成方式：https://github.com/Liam52/luci-app-gdou-srun
#   由 tools/make-single-file.sh 生成
#
# 用法：
#   scp gdou-router-install.sh root@192.168.1.1:/tmp/
#   ssh root@192.168.1.1 "sh /tmp/gdou-router-install.sh"
#
# 行为：
#   · 不覆盖已有的 /etc/config/gdou-srun，已配置的账号密码会保留
#   · 装完自动启用并启动服务，清理 LuCI 缓存

set -e

[ "$(id -u)" = "0" ] || { echo "请用 root 运行"; exit 1; }

echo "==> 检查 python3"
command -v python3 >/dev/null 2>&1 || {
	echo "错误：未安装 python3，请先执行："
	echo "  opkg update && opkg install python3-light python3-urllib python3-hashlib python3-email"
	exit 1
}

echo "==> 创建目录"
mkdir -p /etc/config /etc/init.d /etc/hotplug.d/iface \
         /usr/libexec /usr/share/luci/menu.d /usr/share/rpcd/acl.d \
         /www/luci-static/resources/view/gdou-srun /www/luci-static/resources/gdou-srun

if [ -f /etc/config/gdou-srun ]; then
	echo "==> 检测到已有配置，保留（备份到 /tmp/gdou-srun.config.bak）"
	cp -f /etc/config/gdou-srun /tmp/gdou-srun.config.bak 2>/dev/null || true
	KEEP_CONFIG=1
else
	KEEP_CONFIG=0
fi

echo "==> 写入文件"
HEADER

	for f in $FILES; do
		# 配置文件已有就跳过，避免覆盖用户账号
		case "$f" in
		etc/config/*)
			printf 'if [ "$KEEP_CONFIG" = "0" ]; then\n'
			printf 'cat > "/%s" <<%s%s%s\n' "$f" "'" "$MARK" "'"
			cat "$SRC/files/$f"
			# 文件末尾若没有换行，heredoc 的结束标记会粘到最后一行上
			[ -n "$(tail -c 1 "$SRC/files/$f")" ] && printf '\n'
			printf '%s\n' "$MARK"
			printf 'fi\n'
			;;
		*)
			printf 'cat > "/%s" <<%s%s%s\n' "$f" "'" "$MARK" "'"
			cat "$SRC/files/$f"
			# 同上：保证分隔符独占一行
			[ -n "$(tail -c 1 "$SRC/files/$f")" ] && printf '\n'
			printf '%s\n' "$MARK"
			;;
		esac
	done

	cat <<'FOOTER'

echo "==> 设置权限"
chmod 755 /etc/init.d/gdou-srun /etc/hotplug.d/iface/90-gdou-srun
chmod 755 /usr/libexec/gdou-srun /usr/libexec/gdou-srun-apply \
          /usr/libexec/gdou-srun-daemon /usr/libexec/gdou-srun-devices \
          /usr/libexec/gdou-srun-dual /usr/libexec/gdou-srun-mac \
          /usr/libexec/gdou-srun-split /usr/libexec/gdou-srun-status \
          /usr/libexec/gdou-srun-diag /usr/libexec/gdou-srun-agent

echo "==> 刷新 LuCI 缓存"
rm -rf /tmp/luci-indexcache* /tmp/luci-modulecache 2>/dev/null || true
/etc/init.d/rpcd restart >/dev/null 2>&1 || true

echo "==> 启用并启动服务"
/etc/init.d/gdou-srun enable  >/dev/null 2>&1 || true
/etc/init.d/gdou-srun restart >/dev/null 2>&1 || true

echo ""
echo "安装完成。"
echo "  LuCI 菜单：服务 → 校园网认证"
echo "  命令行检查：/usr/libexec/gdou-srun check && echo 在线"
echo "  日志：/tmp/gdou-srun.log"
echo ""
echo "菜单没出现就按 Ctrl+F5，或再执行："
echo "  rm -rf /tmp/luci-indexcache* && /etc/init.d/rpcd restart"
FOOTER
} > "$OUT"

chmod +x "$OUT" 2>/dev/null || true
echo "已生成：$OUT"
echo "大小：$(wc -c < "$OUT") 字节"