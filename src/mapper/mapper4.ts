import { IMapper } from '../api/mapper';
import { uint16, uint8 } from '../api/types';
import { IInterrupt } from '../api/interrupt';
import { ICartridge, Mirror } from '../api/cartridge';

// https://wiki.nesdev.com/w/index.php/MMC3#CHR_Banks
// register = ChrBankTable[chrA12Inversion][address >> 10]
const ChrBankTable = [
  // CHR A12 inversion is 0
  [0, 0, 1, 1, 2, 3, 4, 5],
  // CHR A12 inversion is 1
  [2, 3, 4, 5, 0, 0, 1, 1],
];

// https://wiki.nesdev.com/w/index.php/MMC3#PRG_Banks
// register = PrgBankTable[prgBankMode][address >> 13]
const PrgBankTable = [
  // PRG ROM bank mode is 0
  [6, 7, -2, -1],
  [-2, 7, 6, -1],
];

// MMC3: https://wiki.nesdev.com/w/index.php/MMC3
export class Mapper4 implements IMapper {
  public interrupt: IInterrupt;

  private readonly ram: Uint8Array = new Uint8Array(8192);

  private readonly R = new Uint8Array(8).fill(0); // R0 - R7
  private register = 0; // Index of R
  private prgBankMode = 0; // 0 or 1
  private chrA12Inversion = 0; // 0 or 1

  private isIrqEnable = false;
  private irqReloadCounter = 0;
  private irqCounter = 0;

  constructor(
    private readonly cartridge: ICartridge,
    private readonly prg: Uint8Array,
    private readonly chr: Uint8Array,
    private readonly prgBanks = prg.length >> 13,
  ) {}

  public read(address: uint16): uint8 {
    address &= 0xFFFF;

    if (address < 0x2000) {
      return this.readChr(address);
    } else if (address >= 0x8000) {
      return this.readPrg(address);
    } else if (address >= 0x6000) {
      return this.ram[address - 0x6000] & 0xFF;
    } else {
      throw new Error(`Invalid address: ${address.toString(16)}`);
    }
  }

  public write(address: uint16, data: uint8): void {
    address &= 0xFFFF;
    data &= 0xFF;

    if (address >= 0x8000) {
      this.writeRegister(address, data);
    } else if (address >= 0x6000) {
      this.ram[address - 0x6000] = data & 0xFF;
    } else {
      throw new Error(`Invalid address: ${address.toString(16)}, data: '${data}'`);
    }
  }

  public ppuClockHandle(scanLine: number, cycle: number): void {
    if (cycle !== 260) {
      return;
    }

    if (scanLine > 239 && scanLine < 261) {
      return;
    }

    if (this.irqCounter === 0) {
      this.irqCounter = this.irqReloadCounter;
    } else {
      this.irqCounter--;
      if (this.irqCounter === 0 && this.isIrqEnable) {
        this.interrupt.irq();
      }
    }
  }

  private readPrg(address: uint16): uint8 {
    const cpuBank = (address - 0x8000) >> 13;
    const offset = address & 0x1FFF;

    const register = PrgBankTable[this.prgBankMode][cpuBank];
    const bank = register < 0 ? this.prgBanks + register : this.R[register];

    return this.prg[(bank << 13) + offset] & 0xFF;
  }

  private readChr(address: uint16): uint8 {
    const ppuBank = address >> 10;
    const offset = address & 0x03FF;

    const register = ChrBankTable[this.chrA12Inversion][ppuBank];
    let bank = this.R[register];
    if ((register === 0 || register === 1) && ppuBank % 2) { // 2KB bank
      bank++;
    }

    return this.chr[(bank << 10) + offset] & 0xFF;
  }

  private writeRegister(address: uint16, data: uint8): void {
    if (address < 0xA000) {
      if (address & 0x01) {
        // Bank data ($8001-$9FFF, odd)
        this.writeBankData(data);
      } else { // even
        // Bank select ($8000-$9FFE, even)
        this.writeBankSelect(data);
      }
    } else if (address < 0xC000) {
      if (address & 0x01) {
        // TODO: PRG RAM protect ($A001-$BFFF, odd)
      } else {
        // TODO: Mirroring ($A000-$BFFE, even)
        if (this.cartridge.info.mirror !== Mirror.FOUR_SCREEN) {
          this.cartridge.info.mirror = data & 0x01 ? Mirror.HORIZONTAL : Mirror.VERTICAL;
        }
      }
    } else if (address < 0xE000) {
      if (address & 0x01) {
        // IRQ reload ($C001-$DFFF, odd)
        this.irqCounter = 0;
      } else {
        // IRQ latch ($C000-$DFFE, even)
        this.irqReloadCounter = data;
      }
    } else {
      if (address & 0x01) {
        // IRQ enable ($E001-$FFFF, odd)
        this.isIrqEnable = true;
      } else {
        // IRQ disable ($E000-$FFFE, even)
        this.isIrqEnable = false;
      }
    }
  }

  private writeBankSelect(data: uint8) {
    this.register = data & 0x07;
    this.prgBankMode = data & 0x40 ? 1 : 0;
    this.chrA12Inversion = data & 0x80 ? 1 : 0;
  }

  private writeBankData(data: uint8) {
    if (this.register === 6 || this.register === 7) {
      // R6 and R7 will ignore the top two bits
      data &= 0x3F;
    } else if (this.register === 0 || this.register === 1) {
      // R0 and R1 ignore the bottom bit
      data &= 0xFE;
    }

    this.R[this.register] = data;
  }
}
