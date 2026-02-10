// public/models/vad.worklet.js
class VadProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.port.onmessage = (event) => {
        // Handle messages from main thread if needed
      };
    }
  
    process(inputs, outputs, parameters) {
      const input = inputs[0];
      const output = outputs[0];
      
      // Copy input to output (passthrough)
      for (let channel = 0; channel < output.length; channel++) {
        output[channel].set(input[channel]);
      }
      
      return true; // Keep processor alive
    }
  }
  
  registerProcessor('vad-processor', VadProcessor);