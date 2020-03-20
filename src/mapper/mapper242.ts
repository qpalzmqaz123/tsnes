import { IMapper } from '../api/mapper';
import { ICartridge, Mirror } from '../api/cartridge';
import { IInterrupt } from '../api/interrupt';
import { uint16, uint8 } from '../api/types';

// INES Mapper 242: https://wiki.nesdev.com/w/index.php/INES_Mapper_242
export class Mapper242 implements IMapper {
  public interrupt: IInterrupt;

  private readonly ram: Uint8Array = new Uint8Array(8192);
  private prgBankSelect = 0;

  constructor(
    private readonly cartridge: ICartridge,
    private readonly prg: Uint8Array,
    private readonly chr: Uint8Array,
  ) {
    this.chr = new Uint8Array(0x2000);
    this.chr.set(chr);
  }

  public read(address: uint16): uint8 {
    address &= 0xFFFF;

    if (address < 0x2000) {
      return this.chr[address];
    } else if (address >= 0x8000) {
      return this.prg[(this.prgBankSelect << 15) + address - 0x8000];
    } else if (address >= 0x6000) {
      return this.ram[address - 0x6000];
    } else {
      throw new Error(`Invalid address: ${address.toString(16)}`);
    }
  }

  public write(address: uint16, data: uint8): void {
    address &= 0xFFFF;

    if (address < 0x2000) {
      this.chr[address] = data;
    } else if (address >= 0x8000) {
      this.cartridge.info.mirror = data & 0x02 ? Mirror.VERTICAL : Mirror.HORIZONTAL;
      this.prgBankSelect = data >> 3 & 0x0F;
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
