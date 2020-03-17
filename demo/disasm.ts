import { IEmulator } from '../src/api/emulator';
import { IBus } from '../src/api/bus';
import opcodeTable, { AddressingMode, Instruction } from '../src/cpu/opcode-table';
import { sprintf } from 'sprintf-js';
import Timer = NodeJS.Timer;

export class DisASM {
  private cpuBus: IBus;
  private interval: Timer;

  constructor(
    private readonly emulator: IEmulator,
    private readonly element: HTMLElement,
  ) {
    this.cpuBus = (this.emulator as any).cpu.bus;
  }

  public start() {
    this.interval = setInterval(() => {
        this.refresh();
      }, 100);
  }

  public stop() {
    clearInterval(this.interval);
  }

  private refresh(): void {
    const cpu = (this.emulator as any).cpu;

    const disGen = this.disASM(cpu.registers.PC);
    const instrList = Array(30).fill(0).map(() => disGen.next().value);

    this.element.innerHTML = instrList.map(v => `<p><code>${v}</code></p>`).join('\n');
  }

  private *disASM(pc: number): Generator<string> {
    for (let i = pc; i < 0xFFFF;) {
      const opcode = this.cpuBus.readByte(i++);
      const entry = opcodeTable[opcode];
      if (!entry) {
        yield sprintf('%04X: UNDEFINED', i - 1);
        continue;
      }
      const data = new Uint8Array(entry.bytes - 1).fill(0).map(() => this.cpuBus.readByte(i++));

      yield sprintf('%04X: %s %s',
        i - entry.bytes,
        Instruction[entry.instruction],
        this.parseAddressingMode(i - entry.bytes, entry.addressingMode, data)
        );
    }
  }

  private parseAddressingMode(pc: number, mode: AddressingMode, data: Uint8Array): string {
    switch (mode) {
      case AddressingMode.ABSOLUTE:
        return sprintf('$%04X', data[1] << 8 | data[0]);
      case AddressingMode.ABSOLUTE_X:
        return sprintf('$%04X, X', data[1] << 8 | data[0]);
      case AddressingMode.ABSOLUTE_Y:
        return sprintf('$%04X, Y', data[1] << 8 | data[0]);
      case AddressingMode.ACCUMULATOR:
        return 'A';
      case AddressingMode.IMMEDIATE:
        return sprintf('#$%02X', data[0]);
      case AddressingMode.IMPLICIT:
        return '';
      case AddressingMode.INDIRECT:
        return sprintf('($%04X)', data[1] << 8 | data[0]);
      case AddressingMode.INDIRECT_Y_INDEXED:
        return sprintf('($%02X), Y', data[0]);
      case AddressingMode.X_INDEXED_INDIRECT:
        return sprintf('($%02X, X)', data[0]);
      case AddressingMode.RELATIVE:
        return sprintf('$%04X', data[0] & 0x80 ? pc - (0x100 - data[0]) : pc + data[0]);
      case AddressingMode.ZERO_PAGE:
        return sprintf('$%02X', data[0]);
      case AddressingMode.ZERO_PAGE_X:
        return sprintf('$%02X, X', data[0]);
      case AddressingMode.ZERO_PAGE_Y:
        return sprintf('$%02X, Y', data[0]);
      default:
        throw new Error('Invalid addressing mode');
    }
  }
}
