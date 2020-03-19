import { Describe, Test } from 'jest-decorator';
import * as fs from 'fs';
import * as path from 'path';
import { Emulator } from '../../..';

@Describe('Test branch')
class BranchTest {
  @Test('Test basic')
  private testBasic() {
    const nesData = fs.readFileSync(path.resolve(__dirname, './1.Branch_Basics.nes'));
    const emulator: any = new Emulator(nesData);

    for (let i = 0; i < 15; i++) {
      emulator.frame();
    }

    const str = Array('PASSED'.length).fill(0)
      .map((_, i) => String.fromCharCode(emulator.ppuBus.readByte(0x20C2 + i)))
      .join('');

    expect(str).toBe('PASSED');
  }

  @Test('Test backward')
  private testBackward() {
    const nesData = fs.readFileSync(path.resolve(__dirname, './2.Backward_Branch.nes'));
    const emulator: any = new Emulator(nesData);

    for (let i = 0; i < 15; i++) {
      emulator.frame();
    }

    const str = Array('PASSED'.length).fill(0)
      .map((_, i) => String.fromCharCode(emulator.ppuBus.readByte(0x20C2 + i)))
      .join('');

    expect(str).toBe('PASSED');
  }

  @Test('Test forward')
  private testForward() {
    const nesData = fs.readFileSync(path.resolve(__dirname, './3.Forward_Branch.nes'));
    const emulator: any = new Emulator(nesData);

    for (let i = 0; i < 15; i++) {
      emulator.frame();
    }

    const str = Array('PASSED'.length).fill(0)
      .map((_, i) => String.fromCharCode(emulator.ppuBus.readByte(0x20C2 + i)))
      .join('');

    expect(str).toBe('PASSED');
  }
}
