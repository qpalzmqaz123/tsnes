import { IBus } from '../api/bus';
import { IDMA } from '../api/dma';

export class DMA implements IDMA {
  public cpuBus: IBus;
  public oamData: Uint8Array;

  public copy(cpuBusAddr: number): void {
    for (let i = 0; i < 256; i++) {
      this.oamData[i] = this.cpuBus.readByte(cpuBusAddr + i);
    }
  }
}
