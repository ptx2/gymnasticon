var noble = require('@abandonware/noble');

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning(null, true);
    console.log('Scanning...');
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', function(peripheral) {
  if (peripheral.advertisement.localName == "M3") {
    console.log('Discovered Keiser M3: ', peripheral.address);
    try {
      console.log(peripheral.advertisement.manufacturerData);
      console.log('Power: ', peripheral.advertisement.manufacturerData.readUInt16LE(10));
      console.log('Cadence: ', Math.round(peripheral.advertisement.manufacturerData.readUInt16LE(6)/10));
    } catch (err) {
      console.log(`\tError parsing: ${err}`);
      console.log(`\t ${err.stack}`);
    }
  }
});
