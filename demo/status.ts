import { IEmulator } from '../src/api/emulator';
import { ICartridge, Mirror } from '../src/api/cartridge';
import { sprintf } from 'sprintf-js';
import Timer = NodeJS.Timer;

export class Status {
  private interval: Timer;
  private lastFrame = 0;

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
    const frame = ((this.emulator as any).ppu as any).frame;
    const cartridge: ICartridge = (this.emulator as any).cartridge;

    const txt = sprintf('PRG:%dx16KB CHR:%dx8KB mapper#:%d mirror:%s battery-backed:%s trained:%s fps:%d',
      cartridge.info.PRG,
      cartridge.info.CHR,
      cartridge.info.mapper,
      Mirror[cartridge.info.mirror],
      cartridge.info.hasBatteryBacked ? 'yes' : 'no',
      cartridge.info.isTrained ? 'yes' : 'no',
      frame - this.lastFrame,
    );

    this.element.innerHTML = `<code>${txt}</code>`;
    this.lastFrame = frame;
  }
}
