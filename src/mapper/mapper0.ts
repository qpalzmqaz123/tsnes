import { IMapper } from '../api/mapper';
import {uint16, uint8} from '../api/types';

export class Mapper0 implements IMapper {
  private readonly isMirrored: boolean;
  private readonly ram: Uint8Array = new Uint8Array(8192);

  constructor(
    private readonly PRG: Uint8Array,
    private readonly CHR: Uint8Array,
  ) {
    this.isMirrored = PRG.length === 16 * 1024;
  }

  public read(address: uint16): uint8 {
    if (address < 0x2000) {
      return this.CHR[this.parseAddress(address)] & 0xFF;
    } else if (address >= 0x8000) {
      return this.PRG[this.parseAddress(address)] & 0xFF;
    } else if (address >= 0x6000) {
      return this.ram[address - 0x6000];
    } else {
      throw new Error(`Invalid address: ${address.toString(16)}`);
    }
  }

  public write(address: uint16, data: uint8): void {
    if (address < 0x2000) {
      this.CHR[this.parseAddress(address)] = data & 0xFF;
    } else if (address >= 0x8000) {
      this.PRG[this.parseAddress(address)] = data & 0xFF;
    } else if (address >= 0x6000) {
      this.ram[address - 0x6000] = data & 0xFF;
    } else {
      throw new Error(`Invalid address: ${address.toString(16)}`);
    }
  }

  // Refer to http://forums.nesdev.com/viewtopic.php?t=5494
  private parseAddress(address: uint16): uint16 {
    if (address < 0x2000) { // CHR
      return address;
    } else { // PRG
      return (this.isMirrored ? address & 0b1011111111111111 : address) - 0x8000;
    }
  }
}
