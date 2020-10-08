import {test} from 'tape';
import sinon from 'sinon';
import {Simulation} from '../../app/simulation';

test('constant cadence', t => {
  const timeline = [
    cadenceChange(0, 60),
    pedalEvent(0),
    pedalEvent(1000),
    pedalEvent(2000),
    pedalEvent(3000),
  ];
  
  testTimeline(timeline, t);
});

test('start/stop/start', t => {
  const timeline = [
    cadenceChange(0, 60),
    pedalEvent(0),
    pedalEvent(1000),
    pedalEvent(2000),
    pedalEvent(3000),

    cadenceChange(3001, 0),

    cadenceChange(100000, 1000),
    pedalEvent(100000),
    pedalEvent(100060),
  ]

  testTimeline(timeline, t);
});

test('inconsequential cadence changes', t => {
  const timeline = [
    cadenceChange(0, 10),
    pedalEvent(0),
    pedalEvent(6000),
    pedalEvent(12000),
    cadenceChange(12001, 20),
    cadenceChange(12002, 30),
    cadenceChange(12020, 40),
    cadenceChange(12100, 50),
    cadenceChange(12150, 120),
    cadenceChange(12499, 60),
    cadenceChange(12999, 30),
    pedalEvent(14000),
  ]

  testTimeline(timeline, t);
});

test('increase/decrease cadence', t => {
  const timeline = [
    cadenceChange(0, 10),
    pedalEvent(0),
    pedalEvent(6000),

    cadenceChange(6001, 1000),
    pedalEvent(6060),
    pedalEvent(6120),
    pedalEvent(6180),

    cadenceChange(6181, 60),
    pedalEvent(7180),
    pedalEvent(8180),
  ]

  testTimeline(timeline, t);
});

test('varying cadence', t => {
  const timeline = [
    cadenceChange(0, 60),
    pedalEvent(0),
    pedalEvent(1000),
    pedalEvent(2000),

    cadenceChange(2001, 120),
    pedalEvent(2500),
    pedalEvent(3000),

    cadenceChange(3100, 30),
    pedalEvent(5000),
    pedalEvent(7000),

    cadenceChange(8999, 10),
    pedalEvent(13000),
    pedalEvent(19000),

    cadenceChange(24999, 1000),
    pedalEvent(24999),
    pedalEvent(25059),
    pedalEvent(25119),

    cadenceChange(25178, 60),
    pedalEvent(26119),
  ]

  testTimeline(timeline, t);
});


const C = 'CADENCE_CHANGE';
const P = 'PEDAL_EMIT';
const cadenceChange = (timestamp, cadence) => ({timestamp, type: C, cadence})
const pedalEvent = (timestamp) => ({timestamp, type: P})
const isPedalEvent = (evt) => evt.type === P
const isCadenceChange = (evt) => evt.type === C

/**
 * Test that pedal events are emitted with the expected timestamps.
 * @param {object[]} timeline - timestamped events (pedal or cadence change)
 * @param {string} timeline[].type - event type P|C (pedal or cadence change)
 * @param {number} timeline[].timestamp - millisecond timestamp
 * @param {number} [timeline[].cadence] - cadence in rpm (only for cadence change event)
 * @param {Test} t - tape test object
 */
function testTimeline(timeline, t) {
  const timestamps = timeline.filter(isPedalEvent).map(e => e.timestamp);
  const cadenceChanges = timeline.filter(isCadenceChange);
  const duration = Math.max(...timestamps);

  const clock = sinon.useFakeTimers();
  const sim = new Simulation();

  // change sim.cadence at the appropriate times
  for (let {timestamp, cadence} of cadenceChanges) {
    setTimeout(() => { sim.cadence = cadence; }, timestamp);
  }

  t.plan(timestamps.length);

  let i = 0;
  sim.on('pedal', (timestamp) => {
    t.equal(timestamp, timestamps[i], `pedal event ${timestamp}`);
    i++;
  });

  clock.tick(duration);
  clock.restore();
}
