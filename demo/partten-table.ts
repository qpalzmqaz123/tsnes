import { IEmulator } from '../src/api/emulator';
import { getColor } from '../src/emulator/palettes';
import Timer = NodeJS.Timer;

export class ParttenTable {
  private interval: Timer;

  constructor(
    private readonly emulator: IEmulator,
    private readonly canvas: HTMLCanvasElement,
    private readonly ppuAddress: number,
    private readonly context = canvas.getContext('2d'),
    private readonly imageData = context.createImageData(8, 8),
  ) {}

  public start() {
    this.interval = setInterval(() => {
      this.refresh();
    }, 1000);
  }

  public stop() {
    clearInterval(this.interval);
  }

  private refresh(): void {
    const ppuBus = (this.emulator as any).ppuBus;
    const data = new Uint8Array(4096).map((v, i) => ppuBus.readByte(this.ppuAddress + i));
    const tileColors: Uint8Array[] = Array(256).fill(0).map((v, i) => {
      const tileL = data.slice(i * 16, i * 16 + 8);
      const tileH = data.slice(i * 16 + 8, i * 16 + 8 + 8);

      const arr = new Uint8Array(8 * 8);
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const offset = (tileH[y] & (0x80 >> x) ? 0x02 : 0) | (tileL[y] & (0x80 >> x) ? 0x01 : 0);

          arr[y * 8 + x] = ppuBus.readByte(0x3F00 + offset);
        }
      }

      return arr;
    });

    tileColors.forEach((colors, tileOffset) => {
      colors.forEach((color, i) => {
        const rgb = getColor(color);

        this.imageData.data[i * 4] = rgb[0];
        this.imageData.data[i * 4 + 1] = rgb[1];
        this.imageData.data[i * 4 + 2] = rgb[2];
        this.imageData.data[i * 4 + 3] = 255;
      });

      this.context.putImageData(this.imageData, tileOffset % 16 * 8, Math.floor(tileOffset / 16) * 8);
    });
  }
}
