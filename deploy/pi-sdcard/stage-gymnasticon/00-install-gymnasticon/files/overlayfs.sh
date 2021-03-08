export TEXTDOMAIN=OverlayFS

. gettext.sh

if raspi-config nonint get_overlay_now ; then
    echo
        echo $(/usr/bin/gettext "Attention: Overlay Filesystem for "/" is activated and in read-only mode.")
        echo $(/usr/bin/gettext "Any changes - including password changes - will NOT persist beyond a reboot.")
        echo
fi
