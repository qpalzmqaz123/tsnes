import { uint8 } from '../api/types';
import { LENGTH_TABLE, TRIANGLE_VOLUME_TABLE } from './table';
import { IChannel } from '../api/apu';

export class Triangle implements IChannel {
  public volume = 0; // 0-15
  public isEnabled = false;
  public lengthCounter = 0; // 5bit

  private lenghtCounterHalt = false;
  private linearCounterLoad = 0; // 7bit

  private linearCounterReloadFlag = false;
  private linearCounterValue = 0;

  private timer = 0; // 11bit

  private internalTimer = 0;
  private counter = 0;

  public clock(): void {
    if (!this.isEnabled) {
      return;
    }

    if (this.internalTimer === 0) {
      this.internalTimer = this.timer;
      this.step();
    } else {
      this.internalTimer--;
    }
  }

  public processEnvelope(): void {
    // Do nothing
  }

  public processLinearCounter(): void {
    // When the frame counter generates a linear counter clock, the following actions occur in order:
    //   - If the linear counter reload flag is set, the linear counter is reloaded with the counter reload value,
    //     otherwise if the linear counter is non-zero, it is decremented.
    //   - If the control flag is clear, the linear counter reload flag is cleared.
    if (this.linearCounterReloadFlag) {
      this.linearCounterValue = this.linearCounterLoad;
    } else if (this.linearCounterValue > 0) {
      this.linearCounterValue--;
    }

    if (!this.lenghtCounterHalt) {
      this.linearCounterReloadFlag = false;
    }
  }

  public processLengthCounter(): void {
    if (!this.lenghtCounterHalt && this.lengthCounter > 0) {
      this.lengthCounter--;
    }
  }

  public processSweep(): void {
    // Do nothing
  }

  public write(offset: uint8, data: uint8) {
    switch (offset) {
      case 0:
        this.lenghtCounterHalt = !!(data & 0x80);
        this.linearCounterLoad = data & 0x7F;
        break;
      case 1:
        break;
      case 2:
        this.timer = this.timer & 0xFF00 | data;
        break;
      case 3:
        this.timer = this.timer & 0x00FF | (data << 8) & 0x07FF;
        this.lengthCounter = LENGTH_TABLE[data >> 3];

        this.linearCounterReloadFlag = true;
        this.internalTimer = 0;
        break;
    }
  }

  private step(): void {
    this.counter++;

    if (!this.isEnabled || this.lengthCounter === 0 || this.linearCounterValue === 0) {
      this.volume = 0;
    } else {
      this.volume = TRIANGLE_VOLUME_TABLE[this.counter & 0x1F];
    }
  }
}
