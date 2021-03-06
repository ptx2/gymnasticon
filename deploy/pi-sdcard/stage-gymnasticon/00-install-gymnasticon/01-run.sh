#!/bin/bash -e

NODE_SHASUM256=de4440edf147d6b534b7dea61ef2e05eb8b7844dec93bdf324ce2c83cf7a7f3c
NODE_URL=https://unofficial-builds.nodejs.org/download/release/v12.18.3/node-v12.18.3-linux-armv6l.tar.gz
GYMNASTICON_USER=${FIRST_USER_NAME}
GYMNASTICON_GROUP=${FIRST_USER_NAME}

if [ ! -x "${ROOTFS_DIR}/opt/gymnasticon/node/bin/node" ] ; then
  TMPD=$(mktemp -d)
  trap 'rm -rf $TMPD' EXIT
  curl -Lo $TMPD/node.tar.gz ${NODE_URL}
  sha256sum -c <(echo "$NODE_SHASUM256 $TMPD/node.tar.gz")
  install -v -m 644 "$TMPD/node.tar.gz" "${ROOTFS_DIR}/tmp/node.tar.gz"
  on_chroot <<EOF
    mkdir -p /opt/gymnasticon/node
    cd /opt/gymnasticon/node
    tar zxvf /tmp/node.tar.gz --strip 1
    chown -R "${GYMNASTICON_USER}:${GYMNASTICON_GROUP}" /opt/gymnasticon
    echo "export PATH=/opt/gymnasticon/node/bin:\$PATH" >> /home/pi/.profile
EOF
fi

on_chroot <<EOF
su ${GYMNASTICON_USER} -c 'export PATH=/opt/gymnasticon/node/bin:\$PATH; /opt/gymnasticon/node/bin/npm install -g gymnasticon'
EOF

install -v -m 644 files/gymnasticon.json "${ROOTFS_DIR}/etc/gymnasticon.json"
install -v -m 644 files/gymnasticon.service "${ROOTFS_DIR}/etc/systemd/system/gymnasticon.service"
install -v -m 644 files/gymnasticon-mods.service "${ROOTFS_DIR}/etc/systemd/system/gymnasticon-mods.service"

install -v -m 644 files/watchdog.conf "${ROOTFS_DIR}/etc/watchdog.conf"

on_chroot <<EOF
echo 'dtparam=watchdog=on' >> /boot/config.txt
systemctl enable watchdog

systemctl enable gymnasticon
systemctl enable gymnasticon-mods
EOF

install -v -m 644 files/motd "${ROOTFS_DIR}/etc/motd"
install -v -m 644 files/51-garmin-usb.rules "${ROOTFS_DIR}/etc/udev/rules.d/51-garmin-usb.rules"
