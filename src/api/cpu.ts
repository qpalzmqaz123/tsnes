import { uint16, uint8 } from './types';

export enum Flags {
  C = 1 << 0, // Carry
  Z = 1 << 1, // Zero
  I = 1 << 2, // Disable interrupt
  D = 1 << 3, // Decimal Mode ( unused in nes )
  B = 1 << 4, // Break
  U = 1 << 5, // Unused ( always 1 )
  V = 1 << 6, // Overflow
  N = 1 << 7, // Negative
}

export interface IRegisters {
  readonly PC: uint16;
  readonly SP: uint8;
  readonly P: uint8;
  readonly A: uint8;
  readonly X: uint8;
  readonly Y: uint8;
}

export interface ICPU {
  reset(): void;
  clock(): void;
  irq(): void;
  nmi(): void;
}
