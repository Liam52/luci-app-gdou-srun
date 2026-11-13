#
# 广东海洋大学校园网认证（深澜 srun）—— OpenWrt 包
#
include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-gdou-srun
PKG_VERSION:=2.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0-only
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=luci-app-gdou-srun contributors

LUCI_TITLE:=GDou campus network (srun) auto login
LUCI_DESCRIPTION:=Automatically authenticate to the Guangdong Ocean University campus network (srun).
LUCI_DEPENDS:=+python3-light +python3-urllib +python3-hashlib +python3-email
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature