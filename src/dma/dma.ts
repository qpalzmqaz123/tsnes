import { IDMA } from '../api/dma';
import { IPPU } from '../api/ppu';
import { ICPU } from '../api/cpu';

export class DMA implements IDMA {
  public cpu: ICPU;
  public ppu: IPPU;

  public copy(cpuBusAddr: number): void {
    const data = new Uint8Array(256);

    for (let i = 0; i < 256; i++) {
      data[i] = (this.cpu as any).bus.readByte(cpuBusAddr + i);
    }

    this.ppu.dmaCopy(data);

    // The CPU is suspended during the transfer, which will take 513 or 514 cycles after the $4014 write tick.
    // (1 dummy read cycle while waiting for writes to complete, +1 if on an odd CPU cycle, then 256 alternating read/write cycles.)
    (this.cpu as any).suspendCycles = (this.cpu as any).cycles & 0x01 ? 513 : 514;
  }
}
