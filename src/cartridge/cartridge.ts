import { IMapper } from 'src/api/mapper';
import { Mapper0 } from '../mapper/mapper0';
import { ICartridge, IROMInfo, Mirror } from '../api/cartridge';
import { Mapper4 } from '../mapper/mapper4';
import { Mapper1 } from '../mapper/mapper1';
import { Mapper2 } from '../mapper/mapper2';
import { Mapper3 } from '../mapper/mapper3';
import { Mapper74 } from '../mapper/mapper74';
import { Mapper242 } from '../mapper/mapper242';

enum Header {
  PRG = 4,
  CHR = 5,
  FLAG1 = 6,
  FLAG2 = 7,
}

// INES: https://wiki.nesdev.com/w/index.php/INES
export class Cartridge implements ICartridge {
  public readonly mapper: IMapper;
  public readonly info: IROMInfo = {} as any;

  constructor(data: Uint8Array, sram: Uint8Array) {
    Cartridge.checkConstant(data);

    this.parseROMInfo(data);

    const prgOffset = this.info.isTrained ? 16 + 512 : 16;
    const prg = data.slice(prgOffset, prgOffset + this.info.prg * 16 * 1024);

    const chrOffset = prgOffset + prg.length;
    const chr = data.slice(chrOffset, chrOffset + this.info.chr * 8 * 1024);

    switch (this.info.mapper) {
      case 0:
        this.mapper = new Mapper0(this, sram, prg, chr);
        break;
      case 1:
        this.mapper = new Mapper1(this, sram, prg, chr);
        break;
      case 2:
        this.mapper = new Mapper2(this, sram, prg, chr);
        break;
      case 3:
        this.mapper = new Mapper3(this, sram, prg, chr);
        break;
      case 4:
        this.mapper = new Mapper4(this, sram, prg, chr);
        break;
      case 74:
        this.mapper = new Mapper74(this, sram, prg, chr);
        break;
      case 242:
        this.mapper = new Mapper242(this, sram, prg, chr);
        break;
      default:
        throw new Error(`Unsupported mapper: ${this.info.mapper}`);
    }
  }

  private parseROMInfo(data: Uint8Array) {
    this.info.prg = data[Header.PRG];
    this.info.chr = data[Header.CHR];

    const mapperL = data[Header.FLAG1] >> 4;
    const mapperH = data[Header.FLAG2] >> 4;
    this.info.mapper = mapperH << 4 | mapperL;

    this.info.mirror = data[Header.FLAG1] & 0x08 ? Mirror.FOUR_SCREEN :
      data[Header.FLAG1] & 0x01 ? Mirror.VERTICAL : Mirror.HORIZONTAL;

    this.info.hasBatteryBacked = !!(data[Header.FLAG1] & 0x02);
    this.info.isTrained = !!(data[Header.FLAG1] & 0x04);
  }

  private static checkConstant(data: Uint8Array): void {
    const str = 'NES\u001a';
    for (let i = 0; i < str.length; i++) {
      if (data[i] !== str.charCodeAt(i)) {
        throw new Error('Invalid nes file');
      }
    }

    if ((data[7] & 0x0C) === 0x08) {
      throw new Error('NES2.0 is not currently supported');
    }
  }
}
