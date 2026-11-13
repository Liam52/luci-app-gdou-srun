#
# 广东海洋大学校园网认证（深澜 srun）—— OpenWrt 包
#
include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-gdou-srun
PKG_VERSION:=3.1.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0-only
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=Liam52 <https://github.com/Liam52>

LUCI_TITLE:=GDou campus network (srun) auto login
LUCI_DESCRIPTION:=Automatically authenticate to the Guangdong Ocean University campus network (srun).
LUCI_DEPENDS:=+python3-light +python3-urllib +python3-hashlib +python3-email
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature

# luci.mk 会自动安装 files/ 下的全部内容。
# 但在 Windows 上提交到 git 时通常不会记录可执行位（100755），
# 从源码构建出的 opkg 可能装出一堆 644 的脚本，表现为 "Permission denied"。
# 这里在安装完成后显式补一次权限，幂等、无副作用。
define Package/$(PKG_NAME)/postinst
	#!/bin/sh
	chmod 755 \
		/usr/libexec/gdou-srun \
		/usr/libexec/gdou-srun-agent \
		/usr/libexec/gdou-srun-apply \
		/usr/libexec/gdou-srun-daemon \
		/usr/libexec/gdou-srun-devices \
		/usr/libexec/gdou-srun-diag \
		/usr/libexec/gdou-srun-dual \
		/usr/libexec/gdou-srun-mac \
		/usr/libexec/gdou-srun-split \
		/usr/libexec/gdou-srun-status \
		/etc/init.d/gdou-srun \
		/etc/hotplug.d/iface/90-gdou-srun 2>/dev/null
	exit 0
endef
