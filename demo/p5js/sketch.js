   // p5.js sketch
   let particles = [];
   let leftController = null;
   let rightController = null;
   let joycons = {}; // Store Joy-Con data by ID
   let buttonData = {};
   let myfont;
   
   function setup() {
       createCanvas(800, 600, WEBGL);
       colorMode(HSB, 360, 100, 100);

       myfont = loadFont('./OpenSans-Regular.ttf');
       textFont(myfont);
   }
   
   function draw() {
       background(220, 200, 210);
       
       // Draw orientation visualization for each connected Joy-Con
       let controllerCount = 0;
       for (const [id, joycon] of Object.entries(joycons)) {
           push();
           // Offset each controller's visualization
           translate(controllerCount * 200 - 100, 0, 0);
           
           // Convert orientation values to numbers and rotate based on Joy-Con orientation
           const alpha = parseFloat(joycon.orientation?.alpha) || 0;
           const beta = parseFloat(joycon.orientation?.beta) || 0;
           const gamma = parseFloat(joycon.orientation?.gamma) || 0;
           
           rotateY(radians(alpha));
           rotateX(radians(beta));
           rotateZ(radians(gamma));
           
           // Draw a 3D box with different colors for each controller
           fill((controllerCount * 120) % 360, 80, 90);
           box(100, 100, 100);
           
           pop();
           controllerCount++;
       }
       
       // Draw connection status (translate to screen coordinates for text)
       push();
       translate(-width/2, -height/2, 0);
       fill(0);
       textAlign(LEFT);
       textSize(16);
       text(`Controllers: ${Object.keys(joycons).length}`, 20, 30);
       
       // Show orientation for each controller
       let y = 50;
       for (const [id, joycon] of Object.entries(joycons)) {
           if (joycon.orientation) {
               text(`${id} - Alpha: ${parseFloat(joycon.orientation.alpha).toFixed(1)}°`, 20, y);
               text(`${id} - Beta: ${parseFloat(joycon.orientation.beta).toFixed(1)}°`, 20, y + 20);
               text(`${id} - Gamma: ${parseFloat(joycon.orientation.gamma).toFixed(1)}°`, 20, y + 40);
               y += 70;
           }
       }
       
       // Show button states
       for (const [button, pressed] of Object.entries(buttonData)) {
           fill(pressed ? color(0, 80, 90) : color(0, 0, 50));
           text(`${button}: ${pressed}`, 20, y);
           y += 20;
       }
       pop();
       
       // Update particles based on button presses
       if (buttonData.a || buttonData.up) {
           particles.push({
               x: random(-width/2, width/2),
               y: random(-height/2, height/2),
               z: random(-200, 200),
               vx: random(-5, 5),
               vy: random(-5, 5),
               vz: random(-5, 5),
               life: 60,
               hue: random(360)
           });
       }
       
       // Draw and update particles in 3D space
       for (let i = particles.length - 1; i >= 0; i--) {
           const p = particles[i];
           push();
           translate(p.x, p.y, p.z);
           // Use bright, saturated colors that contrast with the light background
           // Remove alpha parameter to avoid transparency issues in HSB mode
           fill(p.hue, 100, 100);
           sphere(5);
           pop();
           
           p.x += p.vx;
           p.y += p.vy;
           p.z += p.vz;
           p.life--;
           
           if (p.life <= 0) {
               particles.splice(i, 1);
           }
       }
   }
   
   // Joy-Con connection and event handling
   async function connectController() {
       try {
           await connectJoyCon();
           console.log('Joy-Con connection initiated');
           
           // Set up event listeners for connected controllers
           setTimeout(() => {
               setupControllerListeners();
           }, 1000);
           
       } catch (error) {
           console.error('Failed to connect Joy-Con:', error);
           alert('Failed to connect Joy-Con. Make sure your browser supports WebHID and the controllers are paired via Bluetooth.');
       }
   }
   
   function setupControllerListeners() {
       for (const [id, joyCon] of connectedJoyCons) {
           console.log('Setting up listener for controller', id);
           
           // Initialize joycon data if not exists
           if (!joycons[id]) {
               joycons[id] = { 
                   orientation: { alpha: 0, beta: 0, gamma: 0 },
                   controller: joyCon 
               };
           }
           
           // Remove existing listener if any
           if (joyCon.eventListenerAttached) continue;
           joyCon.eventListenerAttached = true;
           
           // Enable vibration
           joyCon.enableVibration().catch(console.error);
           
           // Listen for input events
           joyCon.addEventListener('hidinput', (event) => {
               const packet = event.detail;
               
               if (packet.actualOrientation) {
                   joycons[id] = { ...joycons[id], orientation: packet.actualOrientation };
               }
               
               if (packet.buttonStatus) {
                   buttonData = packet.buttonStatus;
                   
                   // Rumble on certain button presses
                   if (packet.buttonStatus.b || packet.buttonStatus.down) {
                       joyCon.rumble(600, 600, 0.3);
                   }
                   
                   // LED effects
                   if (packet.buttonStatus.x || packet.buttonStatus.right) {
                       joyCon.blinkLED(0);
                   }
               }
           });
       }
   }
   
   // Check for new controllers periodically
   setInterval(() => {
       if (connectedJoyCons.size > 0) {
           setupControllerListeners();
       }
   }, 2000);