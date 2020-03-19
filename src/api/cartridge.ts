import { IMapper } from './mapper';

export enum Mirror {
  HORIZONTAL,
  VERTICAL,
  FOUR_SCREEN,
}

export interface IROMInfo {
  prg: number; // 16KB unit
  chr: number; // 8KB unit
  mapper: number; // mapper number
  mirror: Mirror;
  hasBatteryBacked: boolean;
  isTrained: boolean;
}

export interface ICartridge {
  readonly info: IROMInfo;
  readonly mapper: IMapper;
}
