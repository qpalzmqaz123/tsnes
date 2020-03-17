import { IController, SpriteSize } from '../api/ppu';
import { uint8 } from '../api/types';

const BaseNameTableAddressList = [0x2000, 0x2400, 0x2800, 0x2C00];

export class Controller implements IController {
  public baseNameTableAddress = BaseNameTableAddressList[0];
  public vramIncrementStepSize = 1;
  public spritePatternTableAddress = 0;
  public backgroundPatternTableAddress = 0;
  public spriteSize = SpriteSize.SIZE_8X8;
  public isNMIEnabled = false;

  public set data(data: uint8) {
    this.baseNameTableAddress = BaseNameTableAddressList[data & 0x03];
    this.vramIncrementStepSize = data & 0x04 ? 32 : 1;
    this.spritePatternTableAddress = data & 0x08 ? 0x1000 : 0;
    this.backgroundPatternTableAddress = data & 0x10 ? 0x1000 : 0;
    this.spriteSize = data & 0x20 ? SpriteSize.SIZE_8X16 : SpriteSize.SIZE_8X8;
    this.isNMIEnabled = !!(data & 0x80);
  }

  public get data(): uint8 {
    return BaseNameTableAddressList.indexOf(this.baseNameTableAddress) |
      (this.vramIncrementStepSize === 1 ? 0 : 1) << 2 |
      (this.spritePatternTableAddress ? 1 : 0) << 3 |
      (this.backgroundPatternTableAddress ? 1 : 0) << 4 |
      (this.spriteSize === SpriteSize.SIZE_8X8 ? 0 : 1) << 5 |
      (this.isNMIEnabled ? 1 : 0) << 7;
  }
}
