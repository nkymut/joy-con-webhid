(() => {
  // src/madgwick.js
  function Madgwick(sampleInterval, options) {
    options = options || {};
    const sampleFreq = 1e3 / sampleInterval;
    let beta = options.beta || 0.4;
    let initalised = options.doInitialisation === true ? false : true;
    let q0 = 1, q1 = 0, q2 = 0, q3 = 0;
    let recipSampleFreq = 1 / sampleFreq;
    function madgwickAHRSUpdateIMU(gx, gy, gz, ax, ay, az) {
      let recipNorm;
      let s0, s1, s2, s3;
      let qDot1, qDot2, qDot3, qDot4;
      let v2q0, v2q1, v2q2, v2q3, v4q0, v4q1, v4q2, v8q1, v8q2, q0q0, q1q1, q2q2, q3q3;
      qDot1 = 0.5 * (-q1 * gx - q2 * gy - q3 * gz);
      qDot2 = 0.5 * (q0 * gx + q2 * gz - q3 * gy);
      qDot3 = 0.5 * (q0 * gy - q1 * gz + q3 * gx);
      qDot4 = 0.5 * (q0 * gz + q1 * gy - q2 * gx);
      if (!(ax === 0 && ay === 0 && az === 0)) {
        recipNorm = (ax * ax + ay * ay + az * az) ** -0.5;
        ax *= recipNorm;
        ay *= recipNorm;
        az *= recipNorm;
        v2q0 = 2 * q0;
        v2q1 = 2 * q1;
        v2q2 = 2 * q2;
        v2q3 = 2 * q3;
        v4q0 = 4 * q0;
        v4q1 = 4 * q1;
        v4q2 = 4 * q2;
        v8q1 = 8 * q1;
        v8q2 = 8 * q2;
        q0q0 = q0 * q0;
        q1q1 = q1 * q1;
        q2q2 = q2 * q2;
        q3q3 = q3 * q3;
        s0 = v4q0 * q2q2 + v2q2 * ax + v4q0 * q1q1 - v2q1 * ay;
        s1 = v4q1 * q3q3 - v2q3 * ax + 4 * q0q0 * q1 - v2q0 * ay - v4q1 + v8q1 * q1q1 + v8q1 * q2q2 + v4q1 * az;
        s2 = 4 * q0q0 * q2 + v2q0 * ax + v4q2 * q3q3 - v2q3 * ay - v4q2 + v8q2 * q1q1 + v8q2 * q2q2 + v4q2 * az;
        s3 = 4 * q1q1 * q3 - v2q1 * ax + 4 * q2q2 * q3 - v2q2 * ay;
        recipNorm = (s0 * s0 + s1 * s1 + s2 * s2 + s3 * s3) ** -0.5;
        s0 *= recipNorm;
        s1 *= recipNorm;
        s2 *= recipNorm;
        s3 *= recipNorm;
        qDot1 -= beta * s0;
        qDot2 -= beta * s1;
        qDot3 -= beta * s2;
        qDot4 -= beta * s3;
      }
      q0 += qDot1 * recipSampleFreq;
      q1 += qDot2 * recipSampleFreq;
      q2 += qDot3 * recipSampleFreq;
      q3 += qDot4 * recipSampleFreq;
      recipNorm = (q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3) ** -0.5;
      q0 *= recipNorm;
      q1 *= recipNorm;
      q2 *= recipNorm;
      q3 *= recipNorm;
    }
    function cross_product(ax, ay, az, bx, by, bz) {
      return {
        x: ay * bz - az * by,
        y: az * bx - ax * bz,
        z: ax * by - ay * bx
      };
    }
    function eulerAnglesFromImuRad(ax, ay, az, mx, my, mz) {
      const pitch = -Math.atan2(ax, Math.sqrt(ay * ay + az * az));
      const tmp1 = cross_product(ax, ay, az, 1, 0, 0);
      const tmp2 = cross_product(1, 0, 0, tmp1.x, tmp1.y, tmp1.z);
      const roll = Math.atan2(tmp2.y, tmp2.z);
      const cr = Math.cos(roll);
      const sp = Math.sin(pitch);
      const sr = Math.sin(roll);
      const yh = my * cr - mz * sr;
      const xh = mx * Math.cos(pitch) + my * sr * sp + mz * cr * sp;
      const heading = -Math.atan2(yh, xh);
      return {
        heading,
        pitch,
        roll
      };
    }
    function toQuaternion2(eulerAngles) {
      const cy = Math.cos(eulerAngles.heading * 0.5);
      const sy = Math.sin(eulerAngles.heading * 0.5);
      const cp = Math.cos(eulerAngles.pitch * 0.5);
      const sp = Math.sin(eulerAngles.pitch * 0.5);
      const cr = Math.cos(eulerAngles.roll * 0.5);
      const sr = Math.sin(eulerAngles.roll * 0.5);
      return {
        w: cr * cp * cy + sr * sp * sy,
        x: sr * cp * cy - cr * sp * sy,
        y: cr * sp * cy + sr * cp * sy,
        z: cr * cp * sy - sr * sp * cy
      };
    }
    function init(ax, ay, az, mx, my, mz) {
      const ea = eulerAnglesFromImuRad(ax, ay, az, mx, my, mz);
      const iq = toQuaternion2(ea);
      const recipNorm = (iq.w * iq.w + iq.x * iq.x + iq.y * iq.y + iq.z * iq.z) ** -0.5;
      q0 = iq.w * recipNorm;
      q1 = iq.x * recipNorm;
      q2 = iq.y * recipNorm;
      q3 = iq.z * recipNorm;
      initalised = true;
    }
    function madgwickAHRSUpdate(gx, gy, gz, ax, ay, az, mx, my, mz, deltaTimeSec) {
      recipSampleFreq = deltaTimeSec || recipSampleFreq;
      if (!initalised) {
        init(ax, ay, az, mx, my, mz);
      }
      let recipNorm;
      let s0, s1, s2, s3;
      let qDot1, qDot2, qDot3, qDot4;
      let hx, hy;
      let v2q0mx, v2q0my, v2q0mz, v2q1mx, v2bx, v2bz, v4bx, v4bz, v2q0, v2q1, v2q2, v2q3, v2q0q2, v2q2q3;
      let q0q0, q0q1, q0q2, q0q3, q1q1, q1q2, q1q3, q2q2, q2q3, q3q3;
      if (mx === void 0 || my === void 0 || mz === void 0 || mx === 0 && my === 0 && mz === 0) {
        madgwickAHRSUpdateIMU(gx, gy, gz, ax, ay, az);
        return;
      }
      qDot1 = 0.5 * (-q1 * gx - q2 * gy - q3 * gz);
      qDot2 = 0.5 * (q0 * gx + q2 * gz - q3 * gy);
      qDot3 = 0.5 * (q0 * gy - q1 * gz + q3 * gx);
      qDot4 = 0.5 * (q0 * gz + q1 * gy - q2 * gx);
      if (!(ax === 0 && ay === 0 && az === 0)) {
        recipNorm = (ax * ax + ay * ay + az * az) ** -0.5;
        ax *= recipNorm;
        ay *= recipNorm;
        az *= recipNorm;
        recipNorm = (mx * mx + my * my + mz * mz) ** -0.5;
        mx *= recipNorm;
        my *= recipNorm;
        mz *= recipNorm;
        v2q0mx = 2 * q0 * mx;
        v2q0my = 2 * q0 * my;
        v2q0mz = 2 * q0 * mz;
        v2q1mx = 2 * q1 * mx;
        v2q0 = 2 * q0;
        v2q1 = 2 * q1;
        v2q2 = 2 * q2;
        v2q3 = 2 * q3;
        v2q0q2 = 2 * q0 * q2;
        v2q2q3 = 2 * q2 * q3;
        q0q0 = q0 * q0;
        q0q1 = q0 * q1;
        q0q2 = q0 * q2;
        q0q3 = q0 * q3;
        q1q1 = q1 * q1;
        q1q2 = q1 * q2;
        q1q3 = q1 * q3;
        q2q2 = q2 * q2;
        q2q3 = q2 * q3;
        q3q3 = q3 * q3;
        hx = mx * q0q0 - v2q0my * q3 + v2q0mz * q2 + mx * q1q1 + v2q1 * my * q2 + v2q1 * mz * q3 - mx * q2q2 - mx * q3q3;
        hy = v2q0mx * q3 + my * q0q0 - v2q0mz * q1 + v2q1mx * q2 - my * q1q1 + my * q2q2 + v2q2 * mz * q3 - my * q3q3;
        v2bx = Math.sqrt(hx * hx + hy * hy);
        v2bz = -v2q0mx * q2 + v2q0my * q1 + mz * q0q0 + v2q1mx * q3 - mz * q1q1 + v2q2 * my * q3 - mz * q2q2 + mz * q3q3;
        v4bx = 2 * v2bx;
        v4bz = 2 * v2bz;
        s0 = -v2q2 * (2 * q1q3 - v2q0q2 - ax) + v2q1 * (2 * q0q1 + v2q2q3 - ay) - v2bz * q2 * (v2bx * (0.5 - q2q2 - q3q3) + v2bz * (q1q3 - q0q2) - mx) + (-v2bx * q3 + v2bz * q1) * (v2bx * (q1q2 - q0q3) + v2bz * (q0q1 + q2q3) - my) + v2bx * q2 * (v2bx * (q0q2 + q1q3) + v2bz * (0.5 - q1q1 - q2q2) - mz);
        s1 = v2q3 * (2 * q1q3 - v2q0q2 - ax) + v2q0 * (2 * q0q1 + v2q2q3 - ay) - 4 * q1 * (1 - 2 * q1q1 - 2 * q2q2 - az) + v2bz * q3 * (v2bx * (0.5 - q2q2 - q3q3) + v2bz * (q1q3 - q0q2) - mx) + (v2bx * q2 + v2bz * q0) * (v2bx * (q1q2 - q0q3) + v2bz * (q0q1 + q2q3) - my) + (v2bx * q3 - v4bz * q1) * (v2bx * (q0q2 + q1q3) + v2bz * (0.5 - q1q1 - q2q2) - mz);
        s2 = -v2q0 * (2 * q1q3 - v2q0q2 - ax) + v2q3 * (2 * q0q1 + v2q2q3 - ay) - 4 * q2 * (1 - 2 * q1q1 - 2 * q2q2 - az) + (-v4bx * q2 - v2bz * q0) * (v2bx * (0.5 - q2q2 - q3q3) + v2bz * (q1q3 - q0q2) - mx) + (v2bx * q1 + v2bz * q3) * (v2bx * (q1q2 - q0q3) + v2bz * (q0q1 + q2q3) - my) + (v2bx * q0 - v4bz * q2) * (v2bx * (q0q2 + q1q3) + v2bz * (0.5 - q1q1 - q2q2) - mz);
        s3 = v2q1 * (2 * q1q3 - v2q0q2 - ax) + v2q2 * (2 * q0q1 + v2q2q3 - ay) + (-v4bx * q3 + v2bz * q1) * (v2bx * (0.5 - q2q2 - q3q3) + v2bz * (q1q3 - q0q2) - mx) + (-v2bx * q0 + v2bz * q2) * (v2bx * (q1q2 - q0q3) + v2bz * (q0q1 + q2q3) - my) + v2bx * q1 * (v2bx * (q0q2 + q1q3) + v2bz * (0.5 - q1q1 - q2q2) - mz);
        recipNorm = (s0 * s0 + s1 * s1 + s2 * s2 + s3 * s3) ** -0.5;
        s0 *= recipNorm;
        s1 *= recipNorm;
        s2 *= recipNorm;
        s3 *= recipNorm;
        qDot1 -= beta * s0;
        qDot2 -= beta * s1;
        qDot3 -= beta * s2;
        qDot4 -= beta * s3;
      }
      q0 += qDot1 * recipSampleFreq;
      q1 += qDot2 * recipSampleFreq;
      q2 += qDot3 * recipSampleFreq;
      q3 += qDot4 * recipSampleFreq;
      recipNorm = (q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3) ** -0.5;
      q0 *= recipNorm;
      q1 *= recipNorm;
      q2 *= recipNorm;
      q3 *= recipNorm;
    }
    return {
      update: madgwickAHRSUpdate,
      init,
      getQuaternion() {
        return {
          w: q0,
          x: q1,
          y: q2,
          z: q3
        };
      }
    };
  }

  // src/parse.js
  var leftMadgwick = new Madgwick(10);
  var rightMadgwick = new Madgwick(10);
  var rad2deg = 180 / Math.PI;
  function baseSum(array, iteratee) {
    let result;
    for (const value of array) {
      const current = iteratee(value);
      if (current !== void 0) {
        result = result === void 0 ? current : result + current;
      }
    }
    return result;
  }
  function mean(array) {
    return baseMean(array, (value) => value);
  }
  function baseMean(array, iteratee) {
    const length = array == null ? 0 : array.length;
    return length ? baseSum(array, iteratee) / length : NaN;
  }
  function calculateBatteryLevel(value) {
    let level;
    switch (value[0]) {
      case 8:
        level = "full";
        break;
      case 4:
        level = "medium";
        break;
      case 2:
        level = "low";
        break;
      case 1:
        level = "critical";
        break;
      case 0:
        level = "empty";
        break;
      default:
        level = "charging";
    }
    return level;
  }
  var ControllerType = {
    1: "Left Joy-Con",
    2: "Right Joy-Con",
    3: "Pro Controller"
  };
  var bias = 0.75;
  var zeroBias = 0.0125;
  var scale = Math.PI / 2;
  function toEulerAngles(lastValues, gyroscope, accelerometer, productId) {
    const now = Date.now();
    const dt = lastValues.timestamp ? (now - lastValues.timestamp) / 1e3 : 0;
    lastValues.timestamp = now;
    const norm = Math.sqrt(
      accelerometer.x ** 2 + accelerometer.y ** 2 + accelerometer.z ** 2
    );
    lastValues.alpha = (1 - zeroBias) * (lastValues.alpha + gyroscope.z * dt);
    if (norm !== 0) {
      lastValues.beta = bias * (lastValues.beta + gyroscope.x * dt) + (1 - bias) * (accelerometer.x * scale / norm);
      lastValues.gamma = bias * (lastValues.gamma + gyroscope.y * dt) + (1 - bias) * (accelerometer.y * -scale / norm);
    }
    return {
      alpha: (
        // ToDo: I could only get this to work with a magic multiplier (430).
        productId === 8198 ? (-1 * (lastValues.alpha * 180) / Math.PI * 430 % 90).toFixed(6) : (lastValues.alpha * 180 / Math.PI * 430 % 360).toFixed(6)
      ),
      beta: (-1 * (lastValues.beta * 180) / Math.PI).toFixed(6),
      gamma: productId === 8198 ? (-1 * (lastValues.gamma * 180) / Math.PI).toFixed(6) : (lastValues.gamma * 180 / Math.PI).toFixed(6)
    };
  }
  function toEulerAnglesQuaternion(q) {
    const ww = q.w * q.w;
    const xx = q.x * q.x;
    const yy = q.y * q.y;
    const zz = q.z * q.z;
    return {
      alpha: (rad2deg * Math.atan2(2 * (q.x * q.y + q.z * q.w), xx - yy - zz + ww)).toFixed(6),
      beta: (rad2deg * -Math.asin(2 * (q.x * q.z - q.y * q.w))).toFixed(6),
      gamma: (rad2deg * Math.atan2(2 * (q.y * q.z + q.x * q.w), -xx - yy + zz + ww)).toFixed(6)
    };
  }
  function toQuaternion(gyro, accl, productId) {
    if (productId === 8198) {
      leftMadgwick.update(gyro.x, gyro.y, gyro.z, accl.x, accl.y, accl.z);
      return leftMadgwick.getQuaternion();
    }
    rightMadgwick.update(gyro.x, gyro.y, gyro.z, accl.x, accl.y, accl.z);
    return rightMadgwick.getQuaternion();
  }
  function toAcceleration(value) {
    const view = new DataView(value.buffer);
    return parseFloat((244e-6 * view.getInt16(0, true)).toFixed(6));
  }
  function toDegreesPerSecond(value) {
    const view = new DataView(value.buffer);
    return parseFloat((0.06103 * view.getInt16(0, true)).toFixed(6));
  }
  function toRevolutionsPerSecond(value) {
    const view = new DataView(value.buffer);
    return parseFloat((1694e-7 * view.getInt16(0, true)).toFixed(6));
  }
  function parseDeviceInfo(rawData, data) {
    const bytes = rawData.slice(15, 15 + 11);
    const firmwareMajorVersionRaw = bytes.slice(0, 1)[0];
    const firmwareMinorVersionRaw = bytes.slice(1, 2)[0];
    const typeRaw = bytes.slice(2, 3);
    const macAddressRaw = bytes.slice(4, 10);
    const macAddress = [];
    macAddressRaw.forEach((number) => {
      macAddress.push(number.toString(16));
    });
    const spiColorInUseRaw = bytes.slice(11, 12);
    const result = {
      _raw: bytes.slice(0, 12),
      _hex: bytes.slice(0, 12),
      firmwareVersion: {
        major: firmwareMajorVersionRaw,
        minor: firmwareMinorVersionRaw
      },
      type: ControllerType[typeRaw[0]],
      macAddress: macAddress.join(":"),
      spiColorInUse: spiColorInUseRaw[0] === 1
    };
    return result;
  }
  function parseInputReportID(rawData, data) {
    const inputReportID = {
      _raw: rawData.slice(0, 1),
      // index 0
      _hex: data.slice(0, 1)
    };
    return inputReportID;
  }
  function parseTimer(rawData, data) {
    const timer = {
      _raw: rawData.slice(1, 2),
      // index 1
      _hex: data.slice(1, 2)
    };
    return timer;
  }
  function parseBatteryLevel(rawData, data) {
    const batteryLevel = {
      _raw: rawData.slice(2, 3),
      // high nibble
      _hex: data.slice(2, 3),
      level: calculateBatteryLevel(data.slice(2, 3))
    };
    return batteryLevel;
  }
  function parseConnectionInfo(rawData, data) {
    const connectionInfo = {
      _raw: rawData.slice(2, 3),
      // low nibble
      _hex: data.slice(2, 3)
    };
    return connectionInfo;
  }
  function parseButtonStatus(rawData, data) {
    const buttonStatus = {
      _raw: rawData.slice(1, 3),
      // index 1,2
      _hex: data.slice(1, 3)
    };
    return buttonStatus;
  }
  function parseCompleteButtonStatus(rawData, data) {
    const buttonStatus = {
      _raw: rawData.slice(3, 6),
      // index 3,4,5
      _hex: data.slice(3, 6),
      // Byte 3 (Right Joy-Con)
      y: Boolean(1 & rawData[3]),
      x: Boolean(2 & rawData[3]),
      b: Boolean(4 & rawData[3]),
      a: Boolean(8 & rawData[3]),
      r: Boolean(64 & rawData[3]),
      zr: Boolean(128 & rawData[3]),
      // Byte 5 (Left Joy-Con)
      down: Boolean(1 & rawData[5]),
      up: Boolean(2 & rawData[5]),
      right: Boolean(4 & rawData[5]),
      left: Boolean(8 & rawData[5]),
      l: Boolean(64 & rawData[5]),
      zl: Boolean(128 & rawData[5]),
      // Byte 3,5 (Shared)
      sr: Boolean(16 & rawData[3]) || Boolean(16 & rawData[5]),
      sl: Boolean(32 & rawData[3]) || Boolean(32 & rawData[5]),
      // Byte 4 (Shared)
      minus: Boolean(1 & rawData[4]),
      plus: Boolean(2 & rawData[4]),
      rightStick: Boolean(4 & rawData[4]),
      leftStick: Boolean(8 & rawData[4]),
      home: Boolean(16 & rawData[4]),
      capture: Boolean(32 & rawData[4]),
      chargingGrip: Boolean(128 & rawData[4])
    };
    return buttonStatus;
  }
  function parseAnalogStick(rawData, data) {
    const analogStick = {
      _raw: rawData.slice(3, 4),
      // index 3
      _hex: data.slice(3, 4)
    };
    return analogStick;
  }
  function parseAnalogStickLeft(rawData, data) {
    let horizontal = rawData[6] | (rawData[7] & 15) << 8;
    horizontal = ((horizontal / 1995 - 1) * 2).toFixed(1);
    let vertical = (rawData[7] >> 4 | rawData[8] << 4) * -1;
    vertical = ((vertical / 2220 + 1) * 2).toFixed(1);
    const analogStickLeft = {
      _raw: rawData.slice(6, 9),
      // index 6,7,8
      _hex: data.slice(6, 9),
      horizontal,
      vertical
    };
    return analogStickLeft;
  }
  function parseAnalogStickRight(rawData, data) {
    let horizontal = rawData[9] | (rawData[10] & 15) << 8;
    horizontal = ((horizontal / 1995 - 1) * 2).toFixed(1);
    let vertical = (rawData[10] >> 4 | rawData[11] << 4) * -1;
    vertical = ((vertical / 2220 + 1) * 2).toFixed(1);
    const analogStickRight = {
      _raw: rawData.slice(9, 12),
      // index 9,10,11
      _hex: data.slice(9, 12),
      horizontal,
      vertical
    };
    return analogStickRight;
  }
  function parseFilter(rawData, data) {
    const filter = {
      _raw: rawData.slice(4),
      // index 4
      _hex: data.slice(4)
    };
    return filter;
  }
  function parseVibrator(rawData, data) {
    const vibrator = {
      _raw: rawData.slice(12, 13),
      // index 12
      _hex: data.slice(12, 13)
    };
    return vibrator;
  }
  function parseAck(rawData, data) {
    const ack = {
      _raw: rawData.slice(13, 14),
      // index 13
      _hex: data.slice(13, 14)
    };
    return ack;
  }
  function parseSubcommandID(rawData, data) {
    const subcommandID = {
      _raw: rawData.slice(14, 15),
      // index 14
      _hex: data.slice(14, 15)
    };
    return subcommandID;
  }
  function parseSubcommandReplyData(rawData, data) {
    const subcommandReplyData = {
      _raw: rawData.slice(15),
      // index 15 ~
      _hex: data.slice(15)
    };
    return subcommandReplyData;
  }
  function parseAccelerometers(rawData, data) {
    const accelerometers = [
      {
        x: {
          _raw: rawData.slice(13, 15),
          // index 13,14
          _hex: data.slice(13, 15),
          acc: toAcceleration(rawData.slice(13, 15))
        },
        y: {
          _raw: rawData.slice(15, 17),
          // index 15,16
          _hex: data.slice(15, 17),
          acc: toAcceleration(rawData.slice(15, 17))
        },
        z: {
          _raw: rawData.slice(17, 19),
          // index 17,18
          _hex: data.slice(17, 19),
          acc: toAcceleration(rawData.slice(17, 19))
        }
      },
      {
        x: {
          _raw: rawData.slice(25, 27),
          // index 25,26
          _hex: data.slice(25, 27),
          acc: toAcceleration(rawData.slice(25, 27))
        },
        y: {
          _raw: rawData.slice(27, 29),
          // index 27,28
          _hex: data.slice(27, 29),
          acc: toAcceleration(rawData.slice(27, 29))
        },
        z: {
          _raw: rawData.slice(29, 31),
          // index 29,30
          _hex: data.slice(29, 31),
          acc: toAcceleration(rawData.slice(29, 31))
        }
      },
      {
        x: {
          _raw: rawData.slice(37, 39),
          // index 37,38
          _hex: data.slice(37, 39),
          acc: toAcceleration(rawData.slice(37, 39))
        },
        y: {
          _raw: rawData.slice(39, 41),
          // index 39,40
          _hex: data.slice(39, 41),
          acc: toAcceleration(rawData.slice(39, 41))
        },
        z: {
          _raw: rawData.slice(41, 43),
          // index 41,42
          _hex: data.slice(41, 43),
          acc: toAcceleration(rawData.slice(41, 43))
        }
      }
    ];
    return accelerometers;
  }
  function parseGyroscopes(rawData, data) {
    const gyroscopes = [
      [
        {
          _raw: rawData.slice(19, 21),
          // index 19,20
          _hex: data.slice(19, 21),
          dps: toDegreesPerSecond(rawData.slice(19, 21)),
          rps: toRevolutionsPerSecond(rawData.slice(19, 21))
        },
        {
          _raw: rawData.slice(21, 23),
          // index 21,22
          _hex: data.slice(21, 23),
          dps: toDegreesPerSecond(rawData.slice(21, 23)),
          rps: toRevolutionsPerSecond(rawData.slice(21, 23))
        },
        {
          _raw: rawData.slice(23, 25),
          // index 23,24
          _hex: data.slice(23, 25),
          dps: toDegreesPerSecond(rawData.slice(23, 25)),
          rps: toRevolutionsPerSecond(rawData.slice(23, 25))
        }
      ],
      [
        {
          _raw: rawData.slice(31, 33),
          // index 31,32
          _hex: data.slice(31, 33),
          dps: toDegreesPerSecond(rawData.slice(31, 33)),
          rps: toRevolutionsPerSecond(rawData.slice(31, 33))
        },
        {
          _raw: rawData.slice(33, 35),
          // index 33,34
          _hex: data.slice(33, 35),
          dps: toDegreesPerSecond(rawData.slice(33, 35)),
          rps: toRevolutionsPerSecond(rawData.slice(33, 35))
        },
        {
          _raw: rawData.slice(35, 37),
          // index 35,36
          _hex: data.slice(35, 37),
          dps: toDegreesPerSecond(rawData.slice(35, 37)),
          rps: toRevolutionsPerSecond(rawData.slice(35, 37))
        }
      ],
      [
        {
          _raw: rawData.slice(43, 45),
          // index 43,44
          _hex: data.slice(43, 45),
          dps: toDegreesPerSecond(rawData.slice(43, 45)),
          rps: toRevolutionsPerSecond(rawData.slice(43, 45))
        },
        {
          _raw: rawData.slice(45, 47),
          // index 45,46
          _hex: data.slice(45, 47),
          dps: toDegreesPerSecond(rawData.slice(45, 47)),
          rps: toRevolutionsPerSecond(rawData.slice(45, 47))
        },
        {
          _raw: rawData.slice(47, 49),
          // index 47,48
          _hex: data.slice(47, 49),
          dps: toDegreesPerSecond(rawData.slice(47, 49)),
          rps: toRevolutionsPerSecond(rawData.slice(47, 49))
        }
      ]
    ];
    return gyroscopes;
  }
  function calculateActualAccelerometer(accelerometers) {
    const elapsedTime = 5e-3 * accelerometers.length;
    const actualAccelerometer = {
      x: parseFloat(
        (mean(accelerometers.map((g) => g[0])) * elapsedTime).toFixed(6)
      ),
      y: parseFloat(
        (mean(accelerometers.map((g) => g[1])) * elapsedTime).toFixed(6)
      ),
      z: parseFloat(
        (mean(accelerometers.map((g) => g[2])) * elapsedTime).toFixed(6)
      )
    };
    return actualAccelerometer;
  }
  function calculateActualGyroscope(gyroscopes) {
    const elapsedTime = 5e-3 * gyroscopes.length;
    const actualGyroscopes = [
      mean(gyroscopes.map((g) => g[0])),
      mean(gyroscopes.map((g) => g[1])),
      mean(gyroscopes.map((g) => g[2]))
    ].map((v) => parseFloat((v * elapsedTime).toFixed(6)));
    return {
      x: actualGyroscopes[0],
      y: actualGyroscopes[1],
      z: actualGyroscopes[2]
    };
  }
  function parseRingCon(rawData, data) {
    const ringcon = {
      _raw: rawData.slice(38, 2),
      _hex: data.slice(38, 2),
      strain: new DataView(rawData.buffer, 39, 2).getInt16(0, true)
    };
    return ringcon;
  }

  // src/connectRingCon.js
  var connectRingCon = async (device) => {
    const defineSendReportAsyncFunction = ({
      subcommand,
      expectedReport,
      timeoutErrorMessage = "timeout."
    }) => {
      return (device2) => new Promise(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
          device2.removeEventListener("inputreport", checkInputReport);
          reject(new Error(timeoutErrorMessage));
        }, 5e3);
        const checkInputReport = (event) => {
          if (event.reportId !== 33) {
            return;
          }
          const data = new Uint8Array(event.data.buffer);
          for (const [key, value] of Object.entries(expectedReport)) {
            if (data[key - 1] !== value) {
              return;
            }
          }
          device2.removeEventListener("inputreport", checkInputReport);
          clearTimeout(timeoutId);
          setTimeout(resolve, 50);
        };
        device2.addEventListener("inputreport", checkInputReport);
        await device2.sendReport(
          1,
          new Uint8Array([
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            ...subcommand
          ])
        );
      });
    };
    const setInputReportModeTo0x30 = defineSendReportAsyncFunction({
      subcommand: [3, 48],
      expectedReport: {
        14: 3
      }
    });
    const enablingMCUData221 = defineSendReportAsyncFunction({
      subcommand: [34, 1],
      expectedReport: {
        13: 128,
        14: 34
      }
    });
    const enablingMCUData212111 = defineSendReportAsyncFunction({
      subcommand: [
        33,
        33,
        1,
        1,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        243
      ],
      expectedReport: {
        14: 33
      }
    });
    const getExtData59 = defineSendReportAsyncFunction({
      subcommand: [89],
      expectedReport: {
        14: 89,
        16: 32
      },
      timeoutErrorMessage: "ring-con not found."
    });
    const getExtDevInFormatConfig5C = defineSendReportAsyncFunction({
      subcommand: [
        92,
        6,
        3,
        37,
        6,
        0,
        0,
        0,
        0,
        28,
        22,
        237,
        52,
        54,
        0,
        0,
        0,
        10,
        100,
        11,
        230,
        169,
        34,
        0,
        0,
        4,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        144,
        168,
        225,
        52,
        54
      ],
      expectedReport: {
        14: 92
      }
    });
    const startExternalPolling5A = defineSendReportAsyncFunction({
      subcommand: [90, 4, 1, 1, 2],
      expectedReport: {
        14: 90
      }
    });
    await enablingMCUData221(device);
    await enablingMCUData212111(device);
    await getExtData59(device);
    await getExtDevInFormatConfig5C(device);
    await startExternalPolling5A(device);
  };

  // src/joycon.js
  var concatTypedArrays = (a, b) => {
    const c = new a.constructor(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
  };
  var JoyCon = class extends EventTarget {
    /**
     * Creates an instance of JoyCon.
     *
     * @param {HIDDevice} device
     * @memberof JoyCon
     */
    constructor(device) {
      super();
      this.device = device;
      this.lastValues = {
        timestamp: null,
        alpha: 0,
        beta: 0,
        gamma: 0
      };
    }
    /**
     * Opens the device.
     *
     * @memberof JoyCon
     */
    async open() {
      if (!this.device.opened) {
        await this.device.open();
      }
      this.device.addEventListener("inputreport", this._onInputReport.bind(this));
    }
    /**
     * Requests information about the device.
     *
     * @memberof JoyCon
     */
    async getRequestDeviceInfo() {
      const outputReportID = 1;
      const subcommand = [2];
      const data = [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        ...subcommand
      ];
      const result = new Promise((resolve) => {
        const onDeviceInfo = ({ detail: deviceInfo }) => {
          this.removeEventListener("deviceinfo", onDeviceInfo);
          delete deviceInfo._raw;
          delete deviceInfo._hex;
          resolve(deviceInfo);
        };
        this.addEventListener("deviceinfo", onDeviceInfo);
      });
      await this.device.sendReport(outputReportID, new Uint8Array(data));
      return result;
    }
    /**
     * Requests information about the battery.
     *
     * @memberof JoyCon
     */
    async getBatteryLevel() {
      const outputReportID = 1;
      const subCommand = [80];
      const data = [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        ...subCommand
      ];
      const result = new Promise((resolve) => {
        const onBatteryLevel = ({ detail: batteryLevel }) => {
          this.removeEventListener("batterylevel", onBatteryLevel);
          delete batteryLevel._raw;
          delete batteryLevel._hex;
          resolve(batteryLevel);
        };
        this.addEventListener("batterylevel", onBatteryLevel);
      });
      await this.device.sendReport(outputReportID, new Uint8Array(data));
      return result;
    }
    /**
     * Enables simple HID mode.
     *
     * @memberof JoyCon
     */
    async enableSimpleHIDMode() {
      const outputReportID = 1;
      const subcommand = [3, 63];
      const data = [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        ...subcommand
      ];
      await this.device.sendReport(outputReportID, new Uint8Array(data));
    }
    /**
     * Enables standard full mode.
     *
     * @memberof JoyCon
     */
    async enableStandardFullMode() {
      const outputReportID = 1;
      const subcommand = [3, 48];
      const data = [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        ...subcommand
      ];
      await this.device.sendReport(outputReportID, new Uint8Array(data));
    }
    /**
     * Enables EMU mode.
     *
     * @memberof JoyCon
     */
    async enableIMUMode() {
      const outputReportID = 1;
      const subcommand = [64, 1];
      const data = [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        ...subcommand
      ];
      await this.device.sendReport(outputReportID, new Uint8Array(data));
    }
    /**
     * Disables IMU mode.
     *
     * @memberof JoyCon
     */
    async disableIMUMode() {
      const outputReportID = 1;
      const subcommand = [64, 0];
      const data = [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        ...subcommand
      ];
      await this.device.sendReport(outputReportID, new Uint8Array(data));
    }
    /**
     * Enables vibration.
     *
     * @memberof JoyCon
     */
    async enableVibration() {
      const outputReportID = 1;
      const subcommand = [72, 1];
      const data = [
        0,
        0,
        1,
        64,
        64,
        0,
        1,
        64,
        64,
        ...subcommand
      ];
      await this.device.sendReport(outputReportID, new Uint8Array(data));
    }
    /**
     * Disables vibration.
     *
     * @memberof JoyCon
     */
    async disableVibration() {
      const outputReportID = 1;
      const subcommand = [72, 0];
      const data = [
        0,
        0,
        1,
        64,
        64,
        0,
        1,
        64,
        64,
        ...subcommand
      ];
      await this.device.sendReport(outputReportID, new Uint8Array(data));
    }
    /**
     * Enables RingCon.
     *
     * @memberof JoyCon
     * @seeAlso https://github.com/mascii/demo-of-ring-con-with-web-hid
     */
    async enableRingCon() {
      await connectRingCon(this.device);
    }
    /**
     * Enables USB HID Joystick report
     *
     * @memberof JoyCon
     */
    async enableUSBHIDJoystickReport() {
      const usb = this.device.collections[0].outputReports.find(
        (r) => r.reportId == 128
      ) != null;
      if (usb) {
        await this.device.sendReport(128, new Uint8Array([1]));
        await this.device.sendReport(128, new Uint8Array([2]));
        await this.device.sendReport(1, new Uint8Array([3]));
        await this.device.sendReport(128, new Uint8Array([4]));
      }
    }
    /**
     * Send a rumble signal to Joy-Con.
     *
     * @param {number} lowFrequency
     * @param {number} highFrequency
     * @param {number} amplitude
     *
     * @memberof JoyCon
     */
    async rumble(lowFrequency, highFrequency, amplitude) {
      const clamp = (value, min, max) => {
        return Math.min(Math.max(value, min), max);
      };
      const outputReportID = 16;
      const data = new Uint8Array(9);
      data[0] = 0;
      let lf = clamp(lowFrequency, 40.875885, 626.286133);
      let hf = clamp(highFrequency, 81.75177, 1252.572266);
      hf = (Math.round(32 * Math.log2(hf * 0.1)) - 96) * 4;
      lf = Math.round(32 * Math.log2(lf * 0.1)) - 64;
      const amp = clamp(amplitude, 0, 1);
      let hfAmp;
      if (amp == 0) {
        hfAmp = 0;
      } else if (amp < 0.117) {
        hfAmp = (Math.log2(amp * 1e3) * 32 - 96) / (5 - Math.pow(amp, 2)) - 1;
      } else if (amp < 0.23) {
        hfAmp = Math.log2(amp * 1e3) * 32 - 96 - 92;
      } else {
        hfAmp = (Math.log2(amp * 1e3) * 32 - 96) * 2 - 246;
      }
      let lfAmp = Math.round(hfAmp) * 0.5;
      const parity = lfAmp % 2;
      if (parity > 0) {
        --lfAmp;
      }
      lfAmp = lfAmp >> 1;
      lfAmp += 64;
      if (parity > 0) {
        lfAmp |= 32768;
      }
      data[1] = hf & 255;
      data[2] = hfAmp + (hf >>> 8 & 255);
      data[3] = lf + (lfAmp >>> 8 & 255);
      data[4] += lfAmp & 255;
      for (let i = 0; i < 4; i++) {
        data[5 + i] = data[1 + i];
      }
      await this.device.sendReport(outputReportID, new Uint8Array(data));
    }
    /**
     * set LED state.
     * @param {int} n position(0-3)
     *
     * @memberof JoyCon
     */
    async setLEDState(n) {
      const NO_RUMBLE = [0, 0, 0, 0, 0, 0, 0, 0];
      const subcommand = [48, n];
      await this.device.sendReport(
        1,
        new Uint8Array([...NO_RUMBLE, 0, ...subcommand])
      );
    }
    /**
     * set LED.
     *
     * @memberof JoyCon
     * @param {int} n position(0-3)
     */
    async setLED(n) {
      this.ledstate |= 1 << n;
      await this.setLEDState(this.ledstate);
    }
    /**
     * reset LED.
     *
     * @memberof JoyCon
     * @param {int} n position(0-3)
     */
    async resetLED(n) {
      this.ledstate &= ~(1 << n | 1 << 4 + n);
      await this.setLEDState(this.ledstate);
    }
    /**
     * blink LED.
     *
     * @memberof JoyCon
     * @param {int} n position(0-3)
     */
    async blinkLED(n) {
      this.ledstate &= ~(1 << n);
      this.ledstate |= 1 << 4 + n;
      await this.setLEDState(this.ledstate);
    }
    /**
     * Deal with `oninputreport` events.
     *
     * @param {*} event
     * @memberof JoyCon
     */
    _onInputReport(event) {
      let { data, reportId, device } = event;
      if (!data) {
        return;
      }
      data = concatTypedArrays(
        new Uint8Array([reportId]),
        new Uint8Array(data.buffer)
      );
      const hexData = data.map((byte) => byte.toString(16));
      let packet = {
        inputReportID: parseInputReportID(data, hexData)
      };
      switch (reportId) {
        case 63: {
          packet = {
            ...packet,
            buttonStatus: parseButtonStatus(data, hexData),
            analogStick: parseAnalogStick(data, hexData),
            filter: parseFilter(data, hexData)
          };
          break;
        }
        case 33:
        case 48: {
          packet = {
            ...packet,
            timer: parseTimer(data, hexData),
            batteryLevel: parseBatteryLevel(data, hexData),
            connectionInfo: parseConnectionInfo(data, hexData),
            buttonStatus: parseCompleteButtonStatus(data, hexData),
            analogStickLeft: parseAnalogStickLeft(data, hexData),
            analogStickRight: parseAnalogStickRight(data, hexData),
            vibrator: parseVibrator(data, hexData)
          };
          if (reportId === 33) {
            packet = {
              ...packet,
              ack: parseAck(data, hexData),
              subcommandID: parseSubcommandID(data, hexData),
              subcommandReplyData: parseSubcommandReplyData(
                data,
                hexData
              ),
              deviceInfo: parseDeviceInfo(data, hexData)
            };
          }
          if (reportId === 48) {
            const accelerometers = parseAccelerometers(
              data,
              hexData
            );
            const gyroscopes = parseGyroscopes(data, hexData);
            const rps = calculateActualGyroscope(
              gyroscopes.map((g) => g.map((v) => v.rps))
            );
            const dps = calculateActualGyroscope(
              gyroscopes.map((g) => g.map((v) => v.dps))
            );
            const acc = calculateActualAccelerometer(
              accelerometers.map((a) => [a.x.acc, a.y.acc, a.z.acc])
            );
            const quaternion = toQuaternion(
              rps,
              acc,
              device.productId
            );
            packet = {
              ...packet,
              accelerometers,
              gyroscopes,
              actualAccelerometer: acc,
              actualGyroscope: {
                dps,
                rps
              },
              actualOrientation: toEulerAngles(
                this.lastValues,
                rps,
                acc,
                device.productId
              ),
              actualOrientationQuaternion: toEulerAnglesQuaternion(quaternion),
              quaternion,
              ringCon: parseRingCon(data, hexData)
            };
          }
          break;
        }
      }
      if (packet.deviceInfo?.type) {
        this._receiveDeviceInfo(packet.deviceInfo);
      }
      if (packet.batteryLevel?.level) {
        this._receiveBatteryLevel(packet.batteryLevel);
      }
      this._receiveInputEvent(packet);
    }
    /**
     *
     *
     * @param {*} deviceInfo
     * @memberof JoyCon
     */
    _receiveDeviceInfo(deviceInfo) {
      this.dispatchEvent(new CustomEvent("deviceinfo", { detail: deviceInfo }));
    }
    /**
     *
     *
     * @param {*} batteryLevel
     * @memberof JoyCon
     */
    _receiveBatteryLevel(batteryLevel) {
      this.dispatchEvent(
        new CustomEvent("batterylevel", { detail: batteryLevel })
      );
    }
  };
  var JoyConLeft = class extends JoyCon {
    /**
     * Creates an instance of JoyConLeft.
     * @param {HIDDevice} device
     * @memberof JoyConLeft
     */
    constructor(device) {
      super(device);
    }
    /**
     *
     *
     * @param {*} packet
     * @memberof JoyConLeft
     */
    _receiveInputEvent(packet) {
      delete packet.buttonStatus.x;
      delete packet.buttonStatus.y;
      delete packet.buttonStatus.b;
      delete packet.buttonStatus.a;
      delete packet.buttonStatus.plus;
      delete packet.buttonStatus.r;
      delete packet.buttonStatus.zr;
      delete packet.buttonStatus.home;
      delete packet.buttonStatus.rightStick;
      this.dispatchEvent(new CustomEvent("hidinput", { detail: packet }));
    }
  };
  var JoyConRight = class extends JoyCon {
    /**
     * Creates an instance of JoyConRight.
     *
     * @param {HIDDevice} device
     * @memberof JoyConRight
     */
    constructor(device) {
      super(device);
    }
    /**
     * Deals with receiving input events.
     *
     * @param {*} packet
     * @memberof JoyConRight
     */
    _receiveInputEvent(packet) {
      delete packet.buttonStatus.up;
      delete packet.buttonStatus.down;
      delete packet.buttonStatus.left;
      delete packet.buttonStatus.right;
      delete packet.buttonStatus.minus;
      delete packet.buttonStatus.l;
      delete packet.buttonStatus.zl;
      delete packet.buttonStatus.capture;
      delete packet.buttonStatus.leftStick;
      this.dispatchEvent(new CustomEvent("hidinput", { detail: packet }));
    }
  };
  var GeneralController = class extends JoyCon {
    /**
     * Creates an instance of GeneralController.
     *
     * @param {HIDDevice} device
     * @memberof GeneralController
     */
    constructor(device) {
      super(device);
    }
    /**
     *
     *
     * @param {*} packet
     * @memberof GeneralController
     */
    _receiveInputEvent(packet) {
      this.dispatchEvent(new CustomEvent("hidinput", { detail: packet }));
    }
  };

  // src/index.js
  var connectedJoyCons = /* @__PURE__ */ new Map();
  var devices = [];
  var getDeviceID = (device) => {
    const n = devices.indexOf(device);
    if (n >= 0) {
      return n;
    }
    devices.push(device);
    return devices.length - 1;
  };
  var addDevice = async (device) => {
    const id = getDeviceID(device);
    console.log(
      `HID connected: ${id} ${device.productId.toString(16)} ${device.productName}`
    );
    connectedJoyCons.set(id, await connectDevice(device));
  };
  var removeDevice = async (device) => {
    const id = getDeviceID(device);
    console.log(
      `HID disconnected: ${id} ${device.productId.toString(16)} ${device.productName}`
    );
    connectedJoyCons.delete(id);
  };
  navigator.hid.addEventListener("connect", async ({ device }) => {
    addDevice(device);
  });
  navigator.hid.addEventListener("disconnect", ({ device }) => {
    removeDevice(device);
  });
  document.addEventListener("DOMContentLoaded", async () => {
    const devices2 = await navigator.hid.getDevices();
    devices2.forEach(async (device) => {
      await addDevice(device);
    });
  });
  var connectJoyCon = async () => {
    const filters = [
      {
        vendorId: 1406
        // Nintendo Co., Ltd
      }
    ];
    try {
      const [device] = await navigator.hid.requestDevice({ filters });
      if (!device) {
        return;
      }
      await addDevice(device);
    } catch (error) {
      console.error(error.name, error.message);
    }
  };
  var connectDevice = async (device) => {
    let joyCon = null;
    if (device.productId === 8198) {
      joyCon = new JoyConLeft(device);
    } else if (device.productId === 8199) {
      if (device.productName === "Joy-Con (R)") {
        joyCon = new JoyConRight(device);
      }
    }
    if (!joyCon) {
      joyCon = new GeneralController(device);
    }
    await joyCon.open();
    await joyCon.enableUSBHIDJoystickReport();
    await joyCon.enableStandardFullMode();
    await joyCon.enableIMUMode();
    return joyCon;
  };

  // src/global.js
  window.JoyConWebHID = {
    connectJoyCon,
    connectedJoyCons,
    JoyConLeft,
    JoyConRight,
    GeneralController
  };
  window.connectJoyCon = connectJoyCon;
  window.connectedJoyCons = connectedJoyCons;
  window.JoyConLeft = JoyConLeft;
  window.JoyConRight = JoyConRight;
  window.GeneralController = GeneralController;
})();
/**
 * @license
 * Joy-Con WebHID Global Wrapper
 * Copyright 2024 Thomas Steiner
 * SPDX-License-Identifier: Apache-2.0
 */
