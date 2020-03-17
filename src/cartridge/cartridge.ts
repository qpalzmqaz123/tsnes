import { IMapper } from 'src/api/mapper';
import { Mapper0 } from '../mapper/mapper0';
import { ICartridge, IROMInfo, Mirror } from '../api/cartridge';

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

  constructor(data: Uint8Array) {
    Cartridge.checkConstant(data);

    this.parseROMInfo(data);

    const PRGOffset = this.info.isTrained ? 16 + 512 : 16;
    const PRG = data.slice(PRGOffset, PRGOffset + this.info.PRG * 16 * 1024);

    const CHROffset = PRGOffset + PRG.length;
    const CHR = data.slice(CHROffset, CHROffset + this.info.CHR * 8 * 1024);

    switch (this.info.mapper) {
      case 0:
        this.mapper = new Mapper0(PRG, CHR);
        break;
      default:
        throw new Error(`Unsupported mapper: ${this.info.mapper}`);
    }
  }

  private parseROMInfo(data: Uint8Array) {
    this.info.PRG = data[Header.PRG];
    this.info.CHR = data[Header.CHR];

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
  }
}
