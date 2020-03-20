import { IMapper } from '../api/mapper';
import { IInterrupt } from '../api/interrupt';
import { uint16, uint8 } from '../api/types';
import { ICartridge } from '../api/cartridge';

// CNROM: https://wiki.nesdev.com/w/index.php/CNROM
export class Mapper3 implements IMapper {
  public interrupt: IInterrupt;

  private readonly ram: Uint8Array = new Uint8Array(8192);
  private chrBankSelect = 0;

  constructor(
    private readonly cartridge: ICartridge,
    private readonly prg: Uint8Array,
    private readonly chr: Uint8Array,
  ) {
    this.chr = new Uint8Array(32 * 1024);
    this.chr.set(chr);

    this.prg = new Uint8Array(32 * 1024);
    this.prg.set(prg);
    if (prg.length === 16 * 1024) {
      this.prg.set(prg, 16 * 1024);
    }
  }

  public read(address: uint16): uint8 {
    address &= 0xFFFF;

    if (address < 0x2000) {
      return this.chr[(this.chrBankSelect << 13) + address];
    } else if (address >= 0x8000) {
      return this.prg[address - 0x8000];
    } else if (address >= 0x6000) {
      return this.ram[address - 0x6000];
    } else {
      throw new Error(`Invalid address: ${address.toString(16)}`);
    }
  }

  public write(address: uint16, data: uint8): void {
    address &= 0xFFFF;

    if (address < 0x2000) {
      this.chr[(this.chrBankSelect << 13) + address] = data;
    } else if (address >= 0x8000) {
      this.chrBankSelect = data & 0x03;
    } else if (address >= 0x6000) {
      this.ram[address - 0x6000] = data;
    } else {
      throw new Error(`Invalid address: ${address.toString(16)}, data: '${data}'`);
    }
  }

  public ppuClockHandle(scanLine: number, cycle: number) {
    // Do nothing
  }
}
