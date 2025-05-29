# p5.js Joy-Con Demo

A creative coding demonstration using Joy-Con controllers with p5.js and WebGL.

## Features

🎮 **3D Joy-Con Control**
- Real-time 3D box rotation based on Joy-Con orientation
- Smooth alpha, beta, gamma angle mapping

🎨 **Interactive Particles**
- Press A button or D-pad UP to spawn colorful particles
- 3D particle physics with random velocities
- Particles fade out over time

📊 **Live Data Display**
- Real-time orientation values (alpha, beta, gamma)
- Button state indicators
- Controller connection status

## How to Use

1. **Setup**:
   - Pair your Joy-Con controllers via Bluetooth
   - Open `p5-global-demo.html` in Chrome/Edge
   - Click "Connect Joy-Con" and select your controller

2. **Controls**:
   - **Move controller**: Rotate the 3D box
   - **A button / D-pad UP**: Spawn particles
   - **B button / D-pad DOWN**: Trigger rumble
   - **X button / D-pad RIGHT**: Blink LED

3. **Interaction**:
   - The 3D box rotates in real-time with your Joy-Con movement
   - Particles appear as colorful spheres floating in 3D space
   - Text overlay shows current orientation and button states

## Technical Details

### 3D Rendering
- Uses p5.js WebGL mode for hardware acceleration
- Real-time coordinate transformation
- Proper 3D lighting and perspective

### Joy-Con Integration
- Uses the global bundle (`joy-con-webhid.min.js`)
- Handles orientation data as strings, converts to numbers
- Implements proper error handling for connection issues

### Code Structure
```javascript
// Global variables for Joy-Con state
let orientation = { alpha: 0, beta: 0, gamma: 0 };
let buttonData = {};

// p5.js functions
function setup() { /* Initialize WebGL canvas */ }
function draw() { /* Render 3D scene */ }

// Joy-Con functions
async function connectController() { /* Handle connection */ }
function setupControllerListeners() { /* Process input */ }
```

## Browser Requirements

- **Chrome/Edge 89+** with WebHID support
- **HTTPS or localhost** (required for WebHID)
- **WebGL support** (most modern browsers)

## Troubleshooting

**"Failed to connect Joy-Con"**
- Ensure controllers are paired via Bluetooth first
- Check that you're using HTTPS or localhost
- Verify browser supports WebHID

**"orientation.alpha.toFixed is not a function"**
- This error has been fixed in the current version
- Joy-Con data comes as strings and is properly converted

**3D visualization not working**
- Ensure your browser supports WebGL
- Check browser console for WebGL errors
- Try updating graphics drivers

## Extending the Demo

This demo provides a foundation for creative Joy-Con applications:

- **Game Development**: Use orientation for character movement
- **Art Installations**: Map gestures to visual effects  
- **Music Controllers**: Convert movement to MIDI or audio parameters
- **Educational Tools**: Teach physics concepts through interaction

See the source code for implementation details and customization options. 