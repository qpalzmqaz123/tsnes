export interface IInterrupt {
  irq(): void;
  nmi(): void;
}
