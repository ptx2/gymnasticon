# Gymnasticon

<p align="center">
<img src="docs/gymnasticon.jpg">
</center>

Gymnasticon enables the obsolete Flywheel Home Bike to work with Zwift and other training apps. Support for other bikes can be added easily.

![Diagram](docs/diagram.png)

## Bikes tested

* Flywheel (tested)
* LifeFitness IC5 (probably works)

## Apps tested

* Zwift
* TrainerRoad (only briefly)
* Rouvy (only briefly)

## Platforms tested

* Raspbian Buster on Raspberry Pi Zero W
* Raspbian Buster on Raspberry Pi 4

Any Linux computer with a Bluetooth 4.1+ adapter (multi-role capability) should work. Older macOS (10.13) may work. Latest macOS should be possible but there are open issues.

## Dependencies

* Node.JS 12.16.1+
  * [armv6l](https://unofficial-builds.nodejs.org/download/release/v12.18.3/) binaries (Pi Zero W)
  * [armv7l](https://nodejs.org/dist/latest-v12.x/) binaries (Pi 4)

* On Linux (including Raspberry Pi)
  * `sudo apt-get install libudev-dev` (required by node-bluetooth-hci-socket)

## Quick Start: Install from npm

> Note: Your user must have permission to access the Bluetooth adapter and advertise services.

    npm install -g gymnasticon
    gymnasticon

To run as an unprivileged user:

    # this gives cap_net_raw+eip to all node programs not just gymnasticon
    sudo setcap cap_net_raw+eip $(eval readlink -f $(which node))

To run at boot time, restart on exit and to avoid giving cap_net_raw+eip to the node binary it is recommended to run under systemd. See the `deploy/gymnasticon.service` from this repository for an example systemd unit file.

    sudo cp gymnasticon.service /etc/systemd/system
    sudo systemctl enable gymnasticon
    sudo systemctl start gymnasticon

To view the output of Gymnasticon running under systemd:

    journalctl -u gymnasticon -f

## CLI options

```text
$ gymnasticon --help
```

```text
   __o
 _ \<_
(_)/(_)

Gymnasticon
v1.0.0

usage: gymnasticon [OPTIONS]

Options:
  --config                <filename> load options from json file        [string]
  --bike                  <type>
                     [string] [choices: "flywheel", "bot"] [default: "flywheel"]
  --bike-connect-timeout  <seconds>                        [number] [default: 0]
  --bike-receive-timeout  <seconds>                        [number] [default: 4]
  --bike-adapter          <name> for bike connection           [default: "hci0"]
  --flywheel-address      <macaddr>
  --flywheel-name         <name>
  --bot-power             <watts> initial bot power                     [number]
  --bot-cadence           <rpm> initial bot cadence                     [number]
  --bot-host              <host> for power/cadence control over udp     [string]
  --bot-port              <port> for power/cadence control over udp     [number]
  --server-adapter        <name> for app connection            [default: "hci0"]
  --server-name           <name> used for Bluetooth advertisement
                                                        [default: "Gymnasticon"]
  --server-ping-interval  <seconds> ping app when user not pedaling
                                                           [number] [default: 1]
  --version               Show version number                          [boolean]
  -h, --help              Show help                                    [boolean]
  ```

## Contributing

    git clone https://github.com/ptx2/gymnasticon.git
    cd gymnasticon
    npm link

## HOWTO: Add support for a bike

It should be trivial to add support for other proprietary bikes, so long as
there is a means of getting realtime-ish cadence/power data from them.

1. Implement a bikeclient in src/bikes
2. Add cli options to src/app/cli-options
3. Add function to instantiate the bikeclient with the cli options to src/bikes/index.js

## License

MIT

## More info

Read the development notes [here](https://ptx2.net/posts/unbricking-a-bike-with-a-raspberry-pi).
