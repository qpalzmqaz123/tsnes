import { uint8 } from './types';

export enum StandardControllerButton {
  A = 0x80,
  B = 0x40,
  SELECT = 0x20,
  START = 0x10,
  UP = 0x08,
  DOWN = 0x04,
  LEFT = 0x02,
  RIGHT = 0x01,
}


export interface IController {
  write(data: uint8);
  read(): uint8;
}

export interface IStandardController extends IController {
  updateButton(button: StandardControllerButton, isPressDown: boolean);
}
