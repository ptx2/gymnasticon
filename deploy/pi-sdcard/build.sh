#!/bin/bash -e

git clone https://github.com/RPi-Distro/pi-gen
cd pi-gen
git fetch
git fetch --tags
git checkout 2020-02-13-raspbian-buster
cp ../config config
cp -a ../stage-gymnasticon stage-gymnasticon
touch stage2/SKIP_IMAGES
./build-docker.sh
