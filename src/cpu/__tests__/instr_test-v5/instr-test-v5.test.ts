import { Describe, Test } from 'jest-decorator';
import * as fs from 'fs';
import { Emulator } from '../../..';
import * as path from 'path';

@Describe('Test instruction')
export class TestInstr {
  @Test('offical only')
  private test() {
    const nesData = fs.readFileSync(path.resolve(__dirname, './official_only.nes'));
    const emulator: any = new Emulator(nesData);

    for (let i = 0; i < 2000; i++) {
      emulator.frame();
    }

    const str = Array('All 16 tests passed'.length).fill(0)
      .map((_, i) => String.fromCharCode(emulator.cpuBus.readByte(0x6004 + i)))
      .join('');

    expect(str).toBe('All 16 tests passed');
  }
}
