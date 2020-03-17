import { IBus } from '../api/bus';
import { uint16, uint8 } from '../api/types';
import { IRAM } from '../api/ram';
import { IPPU } from '../api/ppu';
import { ICartridge } from '../api/cartridge';
import { IController } from '../api/controller';
import { IDMA } from '../api/dma';

// CPU memory map: https://wiki.nesdev.com/w/index.php/CPU_memory_map
export class CPUBus implements IBus {
  public cartridge: ICartridge;
  public ram: IRAM;
  public ppu: IPPU;
  public dma: IDMA;
  public controller1: IController;
  public controller2: IController;

  public writeByte(address: uint16, data: uint8): void {
    if (address < 0x2000) {
      // RAM
      this.ram.write(address & 0x07FF, data);
    } else if (address < 0x4000) {
      // PPU Registers
      this.ppu.cpuWrite(address & 0x2007, data);
    } else if (address === 0x4014) {
      // OAM DMA
      // TODO: DMA needs 512 cycles
      this.dma.copy(data << 8);
    } else if (address === 0x4016 || address === 0x4017) {
      // Controller
      address === 0x4016 ? this.controller1.write(data) : this.controller2.write(data);
    } else if (address < 0x4018) {
      // TODO: APU
    } else if (address < 0x4020) {
      // APU and I/O functionality that is normally disabled
    } else {
      // ROM
      this.cartridge.mapper.write(address, data);
    }
  }

  public writeWord(address: uint16, data: uint16): void {
    this.writeByte(address, data & 0xFF);
    this.writeByte(address + 1, (data >> 8) & 0xFF)
  }

  public readByte(address: uint16): uint8 {
    if (address < 0x2000) {
      // RAM
      return this.ram.read(address & 0x07FF);
    } else if (address < 0x4000) {
      // PPU Registers
      return this.ppu.cpuRead(address & 0x2007);
    } else if (address === 0x4014) {
      // OAM DMA
      return 0;
    } else if (address === 0x4016 || address === 0x4017) {
      // Controller
      return address === 0x4016 ? this.controller1.read() : this.controller2.read();
    } else if (address < 0x4018) {
      // TODO: APU
      return 0;
    } else if (address < 0x4020) {
      // APU and I/O functionality that is normally disabled
      return 0;
    } else {
      // ROM
      return this.cartridge.mapper.read(address);
    }
  }

  public readWord(address: uint16): uint16 {
    return (this.readByte(address + 1) << 8 | this.readByte(address)) & 0xFFFF;
  }
}
