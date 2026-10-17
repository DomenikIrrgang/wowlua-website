#!/bin/sh
# Installed on the droplet as /usr/local/bin/wowlua-deploy-ssh and set as the
# forced command for the wowlua-website CI key in ~deploy/.ssh/authorized_keys.
# Whatever the client asks to run is passed as a single argument and validated there.
exec sudo -n /usr/local/bin/wowlua-deploy "${SSH_ORIGINAL_COMMAND:-}"
