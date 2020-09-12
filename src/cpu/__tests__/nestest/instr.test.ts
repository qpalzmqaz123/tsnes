import { BeforeAll, Describe, Test } from 'jest-decorator';
import { Flags } from '../../../api/cpu';
import * as fs from 'fs';
import * as path from 'path';
import { Emulator } from '../../..';
import { sprintf } from 'sprintf-js';

@Describe('Test cpu instructions')
class TestInstructions {
  private logs: string[];
  private emulator: any;

  @BeforeAll
  private setup() {
    this.logs = fs.readFileSync(path.resolve(__dirname, './nestest.log.txt')).toString().split('\n');
    const nesData = fs.readFileSync(path.resolve(__dirname, './nestest.nes'));

    this.emulator = new Emulator(nesData);

    this.emulator.cpu.reset();
    this.emulator.cpu.registers.PC = 0xC000;
    this.emulator.cpu.deferCycles = 7;
    this.emulator.cpu.setFlag(Flags.I, true);
    this.emulator.cpu.setFlag(Flags.U, true);
    this.emulator.ppu.scanLine = 0;
    this.emulator.ppu.cycle = -21;
  }

  @Test('Test all instruction')
  private test() {
    for (let instr = 0; instr < this.logs.length;) {
      if (this.emulator.cpu.deferCycles === 0) {
        instr++;

        const PC = this.emulator.cpu.registers.PC;
        const A = this.emulator.cpu.registers.A;
        const X = this.emulator.cpu.registers.X;
        const Y = this.emulator.cpu.registers.Y;
        const P = this.emulator.cpu.registers.P;
        const SP = this.emulator.cpu.registers.SP;
        const CYC = this.emulator.cpu.clocks;
        const PPU = [this.emulator.ppu.cycle, this.emulator.ppu.scanLine];

        const log = sprintf('%04X A:%02X X:%02X Y:%02X P:%02X SP:%02X PPU:%3d,%3d CYC:%d',
          PC, A, X, Y, P, SP, PPU[0], PPU[1], CYC);
        const cmpLog = this.logs[instr - 1].substring(0, 4) + ' ' + this.logs[instr - 1].substring(48);

        expect(log.trim()).toMatch(cmpLog.trim());
      }

      this.emulator.cpu.clock();
      this.emulator.ppu.clock();
      this.emulator.ppu.clock();
      this.emulator.ppu.clock();
    }
  }
}
