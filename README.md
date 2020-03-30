# TsNES

NES emulator written in typescript, [Online demo](https://qpalzmqaz123.github.io/tsnes-demo/)

## Usage

```typescript
const emulator = new Emulator(Uint8ArrayNESData, {
  onFrame: frame => {
    ... // output image
  },
  onSample: volume => {
    ... // output audio
  }
});

document.addEventListener('keydown', e => {
  ... // analyse key board code 
  emulator.standardController1.updateButton(StandardControllerButton.A, true);
});

setInterval(() => {
  emulator.frame();
}, 16);
```

## Demo

Here is an demo running in browser

```bash
yarn build
```

Open `dist/index.html` in your browser, then you can choose any nes file
