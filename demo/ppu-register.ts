import { IEmulator } from '../src/api/emulator';
import { sprintf } from 'sprintf-js';
import Timer = NodeJS.Timer;

export class PPURegister {
  private interval: Timer;

  constructor(
    private readonly emulator: IEmulator,
    private readonly element: HTMLElement,
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
    const ppu = (this.emulator as any).ppu;

    const v = ppu.register.v;
    const t = ppu.register.t;
    const x = ppu.register.x;
    const w = ppu.register.w;
    const cycle = ppu.cycle;
    const scanLine = ppu.scanLine;
    const frame = ppu.frame;

    const txt = sprintf('v:%04X t:%04X x:%1X w:%1X scanLine: %03d cycle: %03d frame: %d'
      , v, t, x, w, scanLine, cycle, frame);

    this.element.innerHTML = `<code>${txt}</code>`;
  }
}
