import Ant from 'gd-ant-plus';

/**
 * Create ANT+ stick.
 */
export function createAntStick() {
  let stick = new Ant.GarminStick3; // 0fcf:1009
  if (!stick.is_present()) {
    stick = new Ant.GarminStick2; // 0fcf:1008
  }
  return stick;
}
