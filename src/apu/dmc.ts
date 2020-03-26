import { uint16, uint8 } from '../api/types';
import { IBus } from '../api/bus';
import { DMC_TABLE } from './table';
import { IInterrupt } from '../api/interrupt';

// APU DMC: http://wiki.nesdev.com/w/index.php/APU_DMC
export class Dmc {
  public volume = 0; // 7bit
  public isEnabled = false;
  public cpuBus: IBus;
  public bytesRemainingCounter = 0;
  public interrupt: IInterrupt;
  public interruptFlag = false;

  private isMuted = true;

  private isIrqEnabled = false;
  private isLoopEnabled = false;
  private frequency = 0; // 4bit
  private loadCounter = 0; // 7bit
  private sampleAddress: uint16 = 0;
  private sampleLength: uint16 = 0;

  private clocks = 0;

  private sampleBuffer: uint8 = 0;
  private addressCounter: uint16 = 0;

  private bitsRemainingCounter = 0;

  public clock(): void {
    if (!this.isEnabled) {
      return;
    }

    if (this.clocks % (DMC_TABLE[this.frequency] + 1) === 0) {
      this.outputUnit();
    }

    this.clocks++;
  }

  public write(offset: uint8, data: uint8) {
    switch (offset) {
      case 0:
        this.isIrqEnabled = !!(data & 0x80);
        this.isLoopEnabled = !!(data & 0x40);
        this.frequency = data & 0x0F;
        this.clocks = 0;

        // If clear IRQ flag, the interrupt flag is cleared.
        if (!this.isIrqEnabled) {
          this.interruptFlag = false;
        }
        break;
      case 1:
        this.loadCounter = data & 0x7F;

        this.restartSample();
        break;
      case 2:
        // Sample address = %11AAAAAA.AA000000 = $C000 + (A * 64)
        this.sampleAddress = 0xC000 + data * 64;

        this.restartSample();
        break;
      case 3:
        // Sample length = %LLLL.LLLL0001 = (L * 16) + 1 bytes
        this.sampleLength = data * 16 + 1;

        this.restartSample();
        break;
    }
  }

  private restartSample() {
    // When a sample is (re)started, the current address is set to the sample address, and bytes remaining is set to the sample length.
    this.addressCounter = this.sampleAddress;
    this.bytesRemainingCounter = this.sampleLength;
    this.isMuted = false;
    this.volume = this.loadCounter;
  }

  // http://wiki.nesdev.com/w/index.php/APU_DMC#Memory_reader
  private memoryReader(): void {
    // When the sample buffer is emptied, the memory reader fills the sample buffer with the next byte from the currently playing sample.
    // It has an address counter and a bytes remaining counter.

    if (this.bytesRemainingCounter <= 0 || this.bitsRemainingCounter > 0) {
      return;
    }

    // TODO: The CPU is stalled for up to 4 CPU cycles to allow the longest possible write

    // The sample buffer is filled with the next sample byte read from the current address
    this.sampleBuffer = this.cpuBus.readByte(this.addressCounter);

    // The address is incremented; if it exceeds $FFFF, it is wrapped around to $8000.
    this.addressCounter = this.addressCounter >= 0xFFFF ? 0x8000 : this.addressCounter + 1;

    // The bytes remaining counter is decremented; if it becomes zero and the loop flag is set, the sample is restarted (see above);
    // otherwise, if the bytes remaining counter becomes zero and the IRQ enabled flag is set, the interrupt flag is set.
    this.bytesRemainingCounter--;
    if (this.bytesRemainingCounter <= 0) {
      if (this.isLoopEnabled) {
        this.restartSample();
      } else {
        this.isMuted = true;

        if (this.isIrqEnabled) {
          this.interruptFlag = true;
          this.interrupt.irq();
        }
      }
    }
  }

  // http://wiki.nesdev.com/w/index.php/APU_DMC#Output_unit
  private outputUnit(): void {
    if (this.bitsRemainingCounter <= 0) {
      if (this.isMuted) {
        return;
      }

      this.memoryReader();
      this.bitsRemainingCounter = 8;
    }

    // If the silence flag is clear, the output level changes based on bit 0 of the shift register. If the bit is 1, add 2; otherwise, subtract 2.
    // But if adding or subtracting 2 would cause the output level to leave the 0-127 range, leave the output level unchanged.
    // This means subtract 2 only if the current level is at least 2, or add 2 only if the current level is at most 125.
    if (this.sampleBuffer & 0x01) {
      this.volume = this.volume > 125 ? 127 : this.volume + 2;
    } else {
      this.volume = this.volume < 2 ? 0 : this.volume - 2;
    }

    this.sampleBuffer >>= 1;
    this.bitsRemainingCounter--;
  }
}
