import { IEmulator } from '../src/api/emulator';
import Timer = NodeJS.Timer;

export class Screen {
  private interval: Timer;
  private startTime = 0;
  private frame = 0;

  constructor(
    private readonly emulator: IEmulator,
    private readonly canvas: HTMLCanvasElement,
    private readonly scaleFactor = 3,
    private readonly context = canvas.getContext('2d'),
    private readonly screenImgData = context.createImageData(256 * scaleFactor, 240 * scaleFactor),
  ) {
    this.canvas.height = 240 * scaleFactor;
    this.canvas.width = 256 * scaleFactor;
  }

  public start() {
    this.startTime = Date.now();

    this.interval = setInterval(() => {
      const tmp = Math.floor((Date.now() - this.startTime) * 60 / 1000);
      if (tmp !== this.frame) {
        this.frame = tmp;
        this.refresh();
      }
    }, 1);
  }

  public stop() {
    clearInterval(this.interval);
  }

  private refresh(): void {
    this.emulator.frame();

    const img = this.emulator.getImage();

    let ptr = 0;
    for (let y = 0; y < 240; y++) {
      for (let i = 0; i < this.scaleFactor; i++) {
        for (let x = 0; x < 256; x++) {
          const offset = (y * 256 + x) * 3;

          for (let j = 0; j < this.scaleFactor; j++) {
            this.screenImgData.data[ptr++] = img[offset];
            this.screenImgData.data[ptr++] = img[offset + 1];
            this.screenImgData.data[ptr++] = img[offset + 2];
            this.screenImgData.data[ptr++] = 255;
          }
        }
      }
    }

    this.context.putImageData(this.screenImgData,0,0);
  }
}
