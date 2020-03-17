import { IEmulator } from '../src/api/emulator';
import { getColor } from '../src/emulator/palettes';
import Timer = NodeJS.Timer;

export class Palette {
  private interval: Timer;

  constructor(
    private readonly emulator: IEmulator,
    private readonly canvas: HTMLCanvasElement,
    private readonly ppuAddress: number,
    private readonly context = canvas.getContext('2d'),
  ) {}

  public start() {
    this.interval = setInterval(() => {
      this.refresh();
    }, 100);
  }

  public stop() {
    clearInterval(this.interval);
  }

  private refresh(): void {
    const ppuBus = (this.emulator as any).ppuBus;
    const paletteData = Array(16).fill(0).map((v, i) => ppuBus.readByte(this.ppuAddress + i));
    const colors = paletteData.map(getColor);

    colors.forEach((c, i) => {
      this.context.fillStyle = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
      this.context.fillRect(i * 10, 0, i * 10 + 10, 10);
    });
  }
}
