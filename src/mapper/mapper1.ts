import { IMapper } from '../api/mapper';
import { IInterrupt } from '../api/interrupt';
import { uint16, uint8 } from '../api/types';
import { ICartridge, Mirror } from '../api/cartridge';

// MMC1: https://wiki.nesdev.com/w/index.php/MMC1
export class Mapper1 implements IMapper {
  public interrupt: IInterrupt;

  private shiftRegister = 0x10;

  // 0: switch 8 KB at a time; 1: switch two separate 4 KB banks
  private chrBankMode = 0;
  private chrBanks = [0, 0];

  // 0, 1: switch 32 KB at $8000, ignoring low bit of bank number
  // 2: fix first bank at $8000 and switch 16 KB bank at $C000
  // 3: fix last bank at $C000 and switch 16 KB bank at $8000
  private prgBankMode = 0;
  private prgBank = 0;

  constructor(
    private readonly cartridge: ICartridge,
    private readonly ram: Uint8Array,
    private readonly prg: Uint8Array,
    private readonly chr: Uint8Array,
    private readonly prgBanks = prg.length >> 14,
  ) {
    this.chr = new Uint8Array(128 * 1024);
    this.chr.set(chr);

    this.prgBankMode = 3;
  }

  public read(address: uint16): uint8 {
    address &= 0xFFFF;

    if (address < 0x2000) {
      return this.readChr(address);
    } else if (address >= 0x8000) {
      return this.readPrg(address);
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
      this.writeChr(address, data);
    } else if (address >= 0x8000) {
      // Load register ($8000-$FFFF)
      this.loadRegister(address, data);
    } else if (address >= 0x6000) {
      this.ram[address - 0x6000] = data;
    } else {
      // TODO: Error handling
    }
  }

  public ppuClockHandle(scanLine: number, cycle: number) {
    // Do nothing
  }

  private loadRegister(address: uint16, data: uint8): void {
    if (data & 0x80) {
      // Clear the shift register
      this.shiftRegister = 0x10;
      this.prgBankMode = 3;
    } else {
      const isOnFifthWrite = !!(this.shiftRegister & 0x01);

      this.shiftRegister >>= 1;
      this.shiftRegister |= data & 0x01 ? 0x10 : 0;

      if (isOnFifthWrite) {
        this.writeRegister(address, this.shiftRegister);
        this.shiftRegister = 0x10;
      }
    }
  }

  private writeRegister(address: uint16, data: uint8): void {
    if (address < 0xA000) {
      // Control (internal, $8000-$9FFF)
      switch (data & 0x03) {
        case 0:
          this.cartridge.info.mirror = Mirror.SINGLE_SCREEN_LOWER_BANK;
          break;
        case 1:
          this.cartridge.info.mirror = Mirror.SINGLE_SCREEN_UPPER_BANK;
          break;
        case 2:
          this.cartridge.info.mirror = Mirror.VERTICAL;
          break;
        case 3:
          this.cartridge.info.mirror = Mirror.HORIZONTAL;
          break;
      }
      this.prgBankMode = data >> 2 & 0x03;
      this.chrBankMode = data >> 4 & 0x01;
    } else if (address < 0xC000) {
      // CHR bank 0 (internal, $A000-$BFFF)
      this.chrBanks[0] = data & 0x1F;
    } else if (address < 0xE000) {
      // CHR bank 1 (internal, $C000-$DFFF)
      this.chrBanks[1] = data & 0x1F;
    } else {
      // PRG bank (internal, $E000-$FFFF)
      this.prgBank = data & 0x0F;
    }
  }

  private readChr(address: uint16): uint8 {
    return this.chr[this.chrOffset(address)];
  }

  private writeChr(address: uint16, data: uint8): void {
    this.chr[this.chrOffset(address)] = data;
  }

  private readPrg(address: uint16): uint8 {
    return this.prg[this.prgOffset(address)];
  }

  private chrOffset(address: uint16): uint16 {
    if (this.chrBankMode) {
      // Two separate 4 KB banks
      const bank = address >> 12;
      const offset = address & 0x0FFF;

      return (this.chrBanks[bank] << 12) + offset;
    } else {
      // 8 KB at a time
      return ((this.chrBanks[0] & 0x1E) << 12) + address;
    }
  }

  private prgOffset(address: uint16): uint16 {
    address -= 0x8000;

    const bank = address >> 14;
    const offset = address & 0x3FFF;

    switch (this.prgBankMode) {
      case 0:
      case 1:
        // 0, 1: switch 32 KB at $8000, ignoring low bit of bank number
        return ((this.prgBank & 0x0E) << 14) + address;
      case 2:
        // 2: fix first bank at $8000 and switch 16 KB bank at $C000
        return bank === 0 ? offset : (this.prgBank << 14) + offset;
      case 3:
        // 3: fix last bank at $C000 and switch 16 KB bank at $8000
        return bank === 0 ? (this.prgBank << 14) + offset : ((this.prgBanks - 1) << 14) + offset;
    }
  }
}
