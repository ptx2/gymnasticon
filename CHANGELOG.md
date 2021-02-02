# Changelog

## 1.2.0
- Added ANT+ Bike Power Profile output (for Garmin Fenix and other watches/bike computers). [d72804f6](https://github.com/ptx2/gymnasticon/commit/d72804f601bc7289219901468860a161183d5e2b)
- Fix Bluetooth LE power/cadence reporting issue for Windows clients. [737f8bf5](https://github.com/ptx2/gymnasticon/commit/737f8bf5744cdee7c138c205915b7b3d26115c80)
- Fix Peloton edge-case where user's last-reported cadence persisted after they'd left the ride screen. [1dc4d0d7](https://github.com/ptx2/gymnasticon/commit/1dc4d0d78ffb29f7904741d076529c7d7617f83f)
- Update bleno dependency to add support for recent macOS. [637d6f90](https://github.com/ptx2/gymnasticon/commit/637d6f90e10e5af23a677893a47836f7ced91ead)
- Update ini transitive dependency to fix CVE-2020-7788. [47bec1cd](https://github.com/ptx2/gymnasticon/commit/47bec1cd385925f236b407bd2e2eb2c946765a2a)

## 1.1.0
- Added support for Peloton data source via USB serial device patched to the Peloton data cable. [d9d5f591](https://github.com/ptx2/gymnasticon/commit/d9d5f591ac2367a663da7bd16f5906a1c4847b24)
- Peloton responsiveness improvements. [aef38383](https://github.com/ptx2/gymnasticon/commit/aef38383f074649ce9b2bde2cea24e2dd58f5eba)
- Fix for devices that require crank data to be sent at least every second. [1f0ac252](https://github.com/ptx2/gymnasticon/commit/1f0ac25223146f4f441ddae12f5d95f291e1d9b5)
- Fix burst of pedal events when going from zero to non-zero cadence. [e1e9c681](https://github.com/ptx2/gymnasticon/commit/e1e9c6817fe912878da042e0132079ae0ae9bde3)
- Fix systemd service to always restarts. [54659c64](https://github.com/ptx2/gymnasticon/commit/54659c6432307ad71d2994cc53e3f902010011b7)

## 1.0.5
- Add fix for accurate cadence reporting. [f807cb48](https://github.com/ptx2/gymnasticon/commit/f807cb48c85711e1bbc695762d9293dfaf8a5982)
- Add error message when run with insufficient capabilities. [7cd90d2f](https://github.com/ptx2/gymnasticon/commit/7cd90d2fcabcb354fb5ade7903fa8eb23a523bdb)

## 1.0.4
- Add power-scale and power-offset CLI options. [d6c0e4e0](https://github.com/ptx2/gymnasticon/commit/d6c0e4e067317e4903fafbe1a9016e02087e402f)

## 1.0.3
- Add fix for Flywheel bike's occasional spurious zero power readings. [8f19542f](https://github.com/ptx2/gymnasticon/commit/8f19542fefdc0a25bfdde8fe13392c6c547253cf)

## 1.0.2
- Use a better default value for pedaling timeout. [6b74a655](https://github.com/ptx2/gymnasticon/commit/6b74a6552daadfd7dde582bfe694926fcfb2f810)
- Add minimum Node.js version to NPM package. [11a0b04f](https://github.com/ptx2/gymnasticon/commit/11a0b04f22d71244db9223fc1820ef727587f03d)

## 1.0.1
- Add transpiled files to NPM package. [16010f89](https://github.com/ptx2/gymnasticon/commit/16010f8931335c66fe61b26d0519594a00b4fbb8)

## 1.0.0
- Initial release. [15374e1d](https://github.com/ptx2/gymnasticon/commit/15374e1d825076da835c052f17426b2b47ca50ef)
