import { IMapper } from '../api/mapper';
import { IInterrupt } from '../api/interrupt';
import { uint16, uint8 } from '../api/types';
import { ICartridge } from '../api/cartridge';

// UxROM: https://wiki.nesdev.com/w/index.php/UxROM
export class Mapper2 implements IMapper {
  public interrupt: IInterrupt;

  private bankSelect = 0;

  constructor(
    private readonly cartridge: ICartridge,
    private readonly ram: Uint8Array,
    private readonly prg: Uint8Array,
    private readonly chr: Uint8Array,
  ) {
    this.chr = new Uint8Array(8 * 1024);
    this.chr.set(chr);
  }

  public read(address: uint16): uint8 {
    address &= 0xFFFF;

    if (address < 0x2000) {
      return this.chr[address];
    } else if (address >= 0x8000) {
      return address < 0xC000 ?
        // Bank 0
        this.prg[(this.bankSelect << 14) + address - 0x8000] :
        // Bank 1
        this.prg[this.prg.length - 0x4000 + (address - 0xC000)];
    } else if (address >= 0x6000) {
      return this.ram[address - 0x6000];
    } else {
      // TODO: Error handling
      return 0;
    }
  }

  public write(address: uint16, data: uint8): void {
    address &= 0xFFFF;

    if (address < 0x2000) {
      this.chr[address] = data;
    } else if (address >= 0x8000) {
      // Bank select ($8000-$FFFF)
      this.bankSelect = data & 0x0F;
    } else if (address >= 0x6000) {
      this.ram[address - 0x6000] = data;
    } else {
      // TODO: Error handling
    }
  }

  public ppuClockHandle(scanLine: number, cycle: number) {
    // Do nothing
  }
}
