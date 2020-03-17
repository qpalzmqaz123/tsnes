import { IEmulator } from '../src/api/emulator';
import { sprintf } from 'sprintf-js';
import Timer = NodeJS.Timer;

export class CpuRegister {
  private interval: Timer;

  constructor(
    private readonly emulator: IEmulator,
    private readonly element: HTMLElement,
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
    const cpu = (this.emulator as any).cpu;

    const PC = cpu.registers.PC;
    const SP = cpu.registers.SP;
    const A = cpu.registers.A;
    const X = cpu.registers.X;
    const Y = cpu.registers.Y;
    const P = cpu.registers.P;

    const txt = sprintf('PC:%04X SP:%02X A:%02X X:%02X Y:%02X P:%02X', PC, SP, A, X, Y, P);

    this.element.innerHTML = `<code>${txt}</code>`;
  }
}
