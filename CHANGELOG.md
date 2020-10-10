# Changelog

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
