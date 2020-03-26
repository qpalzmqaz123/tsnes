import { IEmulator } from '../src/api/emulator';
import { getColor } from '../src/emulator/palettes';
import Timer = NodeJS.Timer;

export class NameTable {
  private readonly AddressTable = [0x2000, 0x2400, 0x2800, 0x2C00];
  private interval: Timer;

  constructor(
    private readonly emulator: IEmulator,
    private readonly canvas: HTMLCanvasElement,
    private readonly context = canvas.getContext('2d'),
    private readonly imageData = context.createImageData(8, 8),
  ) {}

  public start() {
    this.interval = setInterval(() => {
      this.refresh();
    }, 300);
  }

  public stop() {
    clearInterval(this.interval);
  }

  private refresh(): void {
    const ppu = (this.emulator as any).ppu;
    const ppuBus = (this.emulator as any).ppuBus;

    for (let screen = 0; screen < 4; screen++) {
      const baseAddress = this.AddressTable[screen];

      for (let i = 0; i < 32 * 30; i++) {
        const tile = ppuBus.readByte(baseAddress + i);
        const coarseX = i & 0x1F;
        const coarseY = i >> 5;

        const attributeOffset = ((coarseY >> 2) << 3) | ((coarseX & 0x1F) >> 2);
        const attributeTable = ppuBus.readByte(baseAddress + 0x3C0 + attributeOffset);
        const isRight = !!(coarseX & 0x02);
        const isBottom = !!(coarseY & 0x02);
        const offset = (isBottom ? 0x02 : 0) | (isRight ? 0x01 : 0);
        const at = attributeTable >> (offset << 1) & 0x03;

        let imageDataOffset = 0;
        for (let y = 0; y < 8; y++) {
          const tileDataL =  ppuBus.readByte(ppu.controller.backgroundPatternTableAddress + (tile << 4) + y);
          const tileDataH =  ppuBus.readByte(ppu.controller.backgroundPatternTableAddress + (tile << 4) + y + 8);

          for (let x = 0; x < 8; x++) {
            const bit0 = (tileDataL >> (7 - x)) & 0x01;
            const bit1 = (tileDataH >> (7 - x)) & 0x01;
            const index = bit1 << 1 | bit0 << 0 | at << 2;

            const color = ppuBus.readByte(0x3F00 + index);
            const rgb = getColor(color);

            this.imageData.data[imageDataOffset++] = rgb[0];
            this.imageData.data[imageDataOffset++] = rgb[1];
            this.imageData.data[imageDataOffset++] = rgb[2];
            this.imageData.data[imageDataOffset++] = 255;
          }
        }

        switch (screen) {
          case 0:
            this.context.putImageData(this.imageData, coarseX * 8, coarseY * 8);
            break;
          case 1:
            this.context.putImageData(this.imageData, coarseX * 8 + 256, coarseY * 8);
            break;
          case 2:
            this.context.putImageData(this.imageData, coarseX * 8, coarseY * 8 + 240);
            break;
          case 3:
            this.context.putImageData(this.imageData, coarseX * 8 + 256, coarseY * 8 + 240);
            break;
        }
      }
    }
  }
}
