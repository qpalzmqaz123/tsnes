import { IRegisters } from '../api/cpu';
import { uint16, uint8 } from '../api/types';

export class Registers implements IRegisters {
  public PC: uint16 = 0;
  public SP: uint8 = 0;
  public P: uint8 = 0;
  public A: uint8 = 0;
  public X: uint8 = 0;
  public Y: uint8 = 0;
}
