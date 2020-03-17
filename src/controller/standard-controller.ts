import { IStandardController, StandardControllerButton } from '../api/controller';
import { uint16, uint8 } from '../api/types';

// Standard controller: http://wiki.nesdev.com/w/index.php/Standard_controller
export class StandardController implements IStandardController {
  private data: number;
  private isStrobe = false;
  private offset = 0;

  public updateButton(button: StandardControllerButton, isPressDown: boolean) {
    if (isPressDown) {
      this.data |= button;
    } else {
      this.data &= ~button & 0xFF;
    }
  }

  public write(data: uint8) {
    if (data & 0x01) {
      this.isStrobe = true;
    } else {
      this.offset = 0;
      this.isStrobe = false;
    }
  }

  public read(): uint8 {
    const data = this.isStrobe ? this.data & StandardControllerButton.A : this.data & (0x80 >> this.offset++);

    return data ? 1 : 0;
  }
}
