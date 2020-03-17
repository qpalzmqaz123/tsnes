import { IInterrupt } from '../api/interrupt';
import { ICPU } from '../api/cpu';

export class Interrupt implements IInterrupt {
  public cpu: ICPU;

  public irq(): void {
    this.cpu.irq();
  }

  public nmi(): void {
    this.cpu.nmi();
  }
}
