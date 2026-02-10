// public/models/vad.worklet.js
class VadHelperWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.port.onmessage = (event) => {
      if (event.data.action === 'process') {
        this.buffer.push(...event.data.audio);
        while (this.buffer.length >= 480) {
          const chunk = this.buffer.splice(0, 480);
          this.port.postMessage({ audio: chunk });
        }
      }
    };
  }

  process(inputs, outputs) {
    return true;
  }
}

registerProcessor('vad-helper-worklet', VadHelperWorklet);