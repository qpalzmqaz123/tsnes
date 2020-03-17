# TsNES

NES emulator written in typescript

## Usage

```typescript
const emulator = new Emulator(Uint8ArrayNESData);

document.addEventListener('keydown', e => {
  ... // analyse key board code 
  emulator.standardController1.updateButton(StandardControllerButton.A, true);
});

setInterval(() => {
  emulator.frame();
  const img = emulator.getImage(); // [R, G, B, R, G, B ...] pixels

  ... // display img
}, 1000 / 60);
```

## Demo

Here is an demo running in browser

```bash
yarn build && cd dist
```

Open index.html in your browser, then you can choose any nes file
