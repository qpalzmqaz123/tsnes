import { Screen } from './screen';
import { DisASM } from './disasm';
import { Palette } from './palette';
import { ParttenTable } from './partten-table';
import { PPURegister } from './ppu-register';
import { NameTable } from './name-table';
import { Status } from './status';
import { StandardControllerButton } from '../src/api/controller';
import { Emulator } from '../src';
import { CpuRegister } from './cpu-register';
import { Audio } from './audio';
import { GameSelector } from './game-selector';

const list = document.getElementById('game-list') as HTMLSelectElement;
const selector = new GameSelector(list);
selector.onChange = (filename, data) => {
  input.disabled = true;
  startGame(filename, data);
};

const input = document.getElementById('file-input') as HTMLInputElement;
input.addEventListener('change', () => {
  input.disabled = true;

  const reader = new FileReader();
  const file = (input as any).files[0];
  let buffer = new Uint8Array(0);

  reader.readAsArrayBuffer(file);

  reader.onload = e => {
    const data = new Uint8Array((e.target as any).result as ArrayBuffer);
    const tmp = new Uint8Array(buffer.length + data.length);

    tmp.set(buffer);
    tmp.set(data, buffer.length);

    buffer = tmp;
  };

  reader.onloadend = () => {
    try {
      list.disabled = true;
      startGame(file.name, buffer);
    } catch (e) {
      // tslint:disable-next-line
      console.log(e);
      alert(e.message);
    }
  };
});

function startGame(filename: string, nesData: Uint8Array) {
  const audio = new Audio();
  const screen = new Screen(document.getElementById('screen') as HTMLCanvasElement);

  const emulator = new Emulator(nesData, {
    sampleRate: audio.sampleRate,
    onSample: volume => audio.onSample(volume),
    onFrame: frame => screen.onFrame(frame),
    sramLoad: (() => {
      if (localStorage.getItem(filename)) {
        return Uint8Array.from(JSON.parse(localStorage.getItem(filename)));
      }
    })(),
  });

  audio.emulator = emulator;
  screen.emulator = emulator;

  const status = new Status(emulator, document.getElementById('status'));
  const cpuRegister = new CpuRegister(emulator, document.getElementById('register'));
  const ppuRegister = new PPURegister(emulator, document.getElementById('ppu-register'));
  const disASM = new DisASM(emulator, document.getElementById('disasm'));
  const backgroundPalette = new Palette(emulator, document.getElementById('background-palette') as HTMLCanvasElement, 0x3F00);
  const spritePalette = new Palette(emulator, document.getElementById('sprite-palette') as HTMLCanvasElement, 0x3F10);
  const parttenTable1 = new ParttenTable(emulator, document.getElementById('partten-table1') as HTMLCanvasElement, 0x0000);
  const parttenTable2 = new ParttenTable(emulator, document.getElementById('partten-table2') as HTMLCanvasElement, 0x1000);
  const nameTable = new NameTable(emulator, document.getElementById('name-table') as HTMLCanvasElement);

  status.start();
  audio.start();

  const debug = document.getElementById('debug-ctrl') as HTMLInputElement;
  debug.addEventListener('change', e => {
    const elements = document.getElementsByClassName('debug');

    if (debug.checked) {
      cpuRegister.start();
      ppuRegister.start();
      disASM.start();
      backgroundPalette.start();
      spritePalette.start();
      parttenTable1.start();
      parttenTable2.start();
      nameTable.start();
    } else {
      cpuRegister.stop();
      ppuRegister.stop();
      disASM.stop();
      backgroundPalette.stop();
      spritePalette.stop();
      parttenTable1.stop();
      parttenTable2.stop();
      nameTable.stop();
    }

    for (let i = 0; i < elements.length; i++) {
      const element = elements.item(i) as HTMLDivElement;

      element.style.display = debug.checked ? 'block' : 'none';
    }
  });

  const trim = document.getElementById('trim-border') as HTMLInputElement;
  trim.addEventListener('change', e => {
      screen.isTrimBorder = trim.checked;
  });

  document.addEventListener('keydown', keyboardHandle);
  document.addEventListener('keyup', keyboardHandle);
  function keyboardHandle(e: KeyboardEvent) {
    let button: StandardControllerButton;
    switch (e.code) {
      case 'KeyW':
        button = StandardControllerButton.UP;
        break;
      case 'KeyS':
        button = StandardControllerButton.DOWN;
        break;
      case 'KeyA':
        button = StandardControllerButton.LEFT;
        break;
      case 'KeyD':
        button = StandardControllerButton.RIGHT;
        break;
      case 'Enter':
        button = StandardControllerButton.START;
        break;
      case 'ShiftRight':
        button = StandardControllerButton.SELECT;
        break;
      case 'KeyL':
        button = StandardControllerButton.A;
        break;
      case 'KeyK':
        button = StandardControllerButton.B;
        break;
    }

    emulator.standardController1.updateButton(button, e.type === 'keydown');
    emulator.standardController2.updateButton(button, e.type === 'keydown');

    e.preventDefault();
  }

  // Save sram every 3 seconds
  setInterval(() => {
    localStorage.setItem(filename, JSON.stringify(Array.from(emulator.sram)));
  }, 3000);

  window.requestAnimationFrame(function frame() {
    emulator.frame();
    window.requestAnimationFrame(frame);
  });
}
