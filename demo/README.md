# Joy-Con WebHID Demos

This directory contains various demonstrations of the Joy-Con WebHID library organized by type.

## Demo Structure

### `basic/`
The original Joy-Con demo with full visualization of controller state.
- **File**: `index.html`
- **Features**: 
  - Interactive Joy-Con visualization
  - Button press highlighting
  - Analog stick movement
  - Real-time orientation display
  - Debug mode with sensor data
- **Type**: ES6 Module usage

### `p5js/`
Joy-Con integration with p5.js for creative coding.
- **File**: `p5-global-demo.html`
- **Features**:
  - 3D WebGL visualization
  - Joy-Con controlled 3D box rotation
  - Particle system triggered by buttons
  - Real-time orientation data display
- **Type**: Global bundle usage (no modules)

### `webmidi/`
Joy-Con to Web MIDI bridge for music applications.
- **File**: `webmidi.html`
- **Features**:
  - MIDI note output from buttons
  - MIDI CC from analog controls and orientation
  - Works with DAWs and music software
  - Configurable MIDI mapping
- **Type**: ES6 Module usage

## Usage Types

### ES6 Module Demos (`basic/`, `webmidi/`)
These demos import the library as ES6 modules:
```javascript
import { connectJoyCon, connectedJoyCons } from '../../src/index.js';
```

### Global Bundle Demos (`p5js/`, `test/`)
These demos use the pre-built global bundle:
```html
<script src="../../dist/joy-con-webhid.min.js"></script>
```

## Running the Demos

1. **Requirements**:
   - Modern browser with WebHID support (Chrome/Edge 89+)
   - HTTPS or localhost environment
   - Joy-Con controllers paired via Bluetooth

2. **Setup**:
   ```bash
   # Build the library first
   npm run build
   
   # Start a local server
   npm start
   ```

3. **Access demos at**:
   - Basic: `http://localhost:8080/demo/basic/`
   - p5.js: `http://localhost:8080/demo/p5js/`
   - WebMIDI: `http://localhost:8080/demo/webmidi/`
   - Test: `http://localhost:8080/demo/test/`

## Browser Compatibility

- **Chrome/Edge 89+**: Full support
- **Firefox**: No WebHID support yet
- **Safari**: No WebHID support yet 