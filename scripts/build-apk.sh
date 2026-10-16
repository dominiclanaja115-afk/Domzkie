#!/usr/bin/env bash
# UgnayPH — Pinoy Social Media App
# Created by: Dominic R. Lanaja
# Copyright © 2026. All Rights Reserved.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK}"
: "${JAVA_HOME:?Set JAVA_HOME to JDK 17}"
export PATH="$JAVA_HOME/bin:$PATH"
TOOLS="$ANDROID_HOME/build-tools/35.0.0"
PLATFORM="$ANDROID_HOME/platforms/android-35/android.jar"
mkdir -p build/{classes,dex,gen}
"$TOOLS/aapt2" compile --dir android/res -o build/resources.zip
"$TOOLS/aapt2" link -o build/base.apk --manifest android/AndroidManifest.xml -I "$PLATFORM" --java build/gen build/resources.zip
javac -source 8 -target 8 -classpath "$PLATFORM" -d build/classes android/src/ph/ugnay/MainActivity.java
jar cf build/classes.jar -C build/classes .
"$TOOLS/d8" --lib "$PLATFORM" --min-api 26 --output build/dex build/classes.jar
cp build/base.apk build/unsigned.apk
(cd build/dex && zip -q -u ../unsigned.apk classes.dex)
"$TOOLS/zipalign" -f -p 4 build/unsigned.apk build/aligned.apk
# Keep this key private and preserve it to sign compatible future updates.
KEYSTORE="${UGNAY_KEYSTORE:-$HOME/.ugnayph/signing.jks}"
mkdir -p "$(dirname "$KEYSTORE")"
umask 077
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -keystore "$KEYSTORE" -alias ugnayph -keyalg RSA -keysize 3072 -validity 10000 -storepass "${UGNAY_STOREPASS:-android}" -keypass "${UGNAY_STOREPASS:-android}" -dname "CN=UgnayPH Development, O=Dominic R. Lanaja, C=PH"
fi
export UGNAY_STOREPASS="${UGNAY_STOREPASS:-android}"
"$TOOLS/apksigner" sign --ks "$KEYSTORE" --ks-key-alias ugnayph --ks-pass env:UGNAY_STOREPASS --key-pass env:UGNAY_STOREPASS --out build/UgnayPH.apk build/aligned.apk
"$TOOLS/apksigner" verify --verbose build/UgnayPH.apk
"$TOOLS/aapt2" dump badging build/UgnayPH.apk
