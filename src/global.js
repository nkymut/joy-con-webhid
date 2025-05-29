/**
 * @license
 * Joy-Con WebHID Global Wrapper
 * Copyright 2024 Thomas Steiner
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  connectJoyCon,
  connectedJoyCons,
  JoyConLeft,
  JoyConRight,
  GeneralController,
} from './index.js';

// Expose the API globally for use in non-module environments
window.JoyConWebHID = {
  connectJoyCon,
  connectedJoyCons,
  JoyConLeft,
  JoyConRight,
  GeneralController,
};

// Also expose individual exports for backwards compatibility
window.connectJoyCon = connectJoyCon;
window.connectedJoyCons = connectedJoyCons;
window.JoyConLeft = JoyConLeft;
window.JoyConRight = JoyConRight;
window.GeneralController = GeneralController; 