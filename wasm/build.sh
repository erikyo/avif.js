#!/bin/bash

set -e

export OPTIMIZE="-O3"
export LDFLAGS="${OPTIMIZE}"
export CFLAGS="${OPTIMIZE}"
export CPPFLAGS="${OPTIMIZE}"

export DOWNLOAD_URL="https://github.com/videolan/dav1d/archive/refs/tags/0.1.0.tar.gz" #v3.2.0

export CMAKE_TOOLCHAIN_FILE=/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake

export PWD=`pwd`
export DAV1D_SRC="${PWD}/src"
export DAV1D_BUILD="${DAV1D_SRC}/embuild"
export DAV1D_FOLDER="${PWD}/src/dav1d/"

test -n "asdasdsad" || (
echo "==============="
echo ""
echo "init"
echo ""
echo "==============="
)
apt-get update
apt-get install --no-install-suggests --no-install-recommends -y \
        git build-essential \
        nasm procps ninja-build python3-pip python3-setuptools \
    && \
    pip3 install meson

echo "==============="
echo ""
echo "download dav1d"
echo ""
echo "==============="
ls -ln
rm -rf $DAV1D_SRC || true
mkdir -p $DAV1D_SRC && cd $DAV1D_SRC
curl -fsSL $DOWNLOAD_URL | tar xvz -C $DAV1D_SRC
mv dav1d-0.1.0 dav1d
cd dav1d
meson build --buildtype release
ninja -C build install

cd $DAV1D_SRC

cd ..

ls -ln

echo "======="
echo ""
echo "wasm"
echo ""
echo "======="
(
  time emcc \
    ${OPTIMIZE} \
    -s WASM=1 \
    -s 'EXPORT_NAME="_decode_avif"' \
    -I$DAV1D_FOLDER/build/ \
    -I$DAV1D_FOLDER/src/ \
    -o decode_avif.js \
    -x c++ \
    decode_avif.c
)


echo "================================================================================"
echo "=====                                                                      ====="
echo "=====                        Successfully completed                        ====="
echo "=====                                                                      ====="
echo "================================================================================"
