import { uint16, uint8 } from '../api/types';
import { LENGTH_TABLE, NOISE_PEROID_TABLE } from './table';
import { IChannel } from '../api/apu';

export class Noise implements IChannel {
  public volume = 0; // 4bit
  public isEnabled = false;
  public lengthCounter = 0;

  private isLengthCounterHalt = false;
  private isConstantVolume = false;
  private envelopeValue = 0;
  private envelopeVolume = 0;
  private envelopeCounter = 0;

  private isLoopNoise = false;
  private noisePeriod = 0;

  private internalTimer = 0;

  public clock(): void {
    if (!this.isEnabled) {
      return;
    }

    if (this.internalTimer === 0) {
      this.internalTimer = this.noisePeriod;
      this.step();
    } else {
      this.internalTimer--;
    }
  }

  public processEnvelope(): void {
    if (this.isConstantVolume) {
      return;
    }

    if (this.envelopeCounter % (this.envelopeValue + 1) === 0) {
      if (this.envelopeVolume === 0) {
        this.envelopeVolume = this.isLengthCounterHalt ? 15 : 0;
      } else {
        this.envelopeVolume--;
      }
    }

    this.envelopeCounter++;
  }

  public processLinearCounter(): void {
    // Do nothing
  }

  public processLengthCounter(): void {
    if (!this.isLengthCounterHalt && this.lengthCounter > 0) {
      this.lengthCounter--;
    }
  }

  public processSweep(): void {
    // Do nothing
  }

  public write(offset: uint16, data: uint8) {
    switch (offset) {
      case 0:
        this.isLengthCounterHalt = !!(data & 0x20);
        this.isConstantVolume = !!(data & 0x10);
        this.envelopeValue = data & 0x0F;

        this.envelopeVolume = 15;
        this.envelopeCounter = 0;
        break;
      case 1:
        break;
      case 2:
        this.isLoopNoise = !!(data & 0x80);
        this.noisePeriod = NOISE_PEROID_TABLE[data & 0x0F];

        this.internalTimer = 0;
        break;
      case 3:
        this.lengthCounter = LENGTH_TABLE[data >> 3];
        break;
    }
  }

  private step(): void {
    if (!this.isEnabled || this.lengthCounter === 0) {
      this.volume = 0;
    } else if (this.isConstantVolume) {
      this.volume = Math.floor(Math.random() * this.envelopeValue);
    } else {
      this.volume = Math.floor(Math.random() * this.envelopeVolume);
    }
  }
}
