/**
 * configController.js
 *
 * Delivers static or lightly-customised configuration to the Android app.
 * Both endpoints are public (no auth) and cached by the client on startup.
 *
 * Main exports:
 *   getAppConfig(req, res, next)     – app-level settings: minimum version, feature flags,
 *                                      capture defaults, legal URLs
 *   getCaptureConfig(req, res, next) – capture session settings: photo step instructions,
 *                                      nonce overlay config, validation rules, timeout
 */

async function getAppConfig (req, res, next) {
  try {
    // For now, return a static config matching the spec.
    res.json({
      minimumAppVersion: '1.0.0',
      forceUpdate: false,
      updateUrl: 'https://play.google.com/store/apps/details?id=com.packageguard',
      maintenanceMode: false,
      maintenanceMessage: null,
      features: {
        videoCapture: true,
        qrScanning: true,
        biometricAuth: false,
        darkMode: true
      },
      captureDefaults: {
        minPhotos: 4,
        maxPhotos: 8,
        timeoutSeconds: 300,
        allowFlash: true
      },
      legal: {
        termsUrl: 'https://packageguard.io/terms',
        privacyUrl: 'https://packageguard.io/privacy'
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getCaptureConfig (req, res, next) {
  try {
    const sellerId = req.query.sellerId;
    void sellerId;

    res.json({
      captureMode: 'GUIDED_PHOTO',
      steps: [
        {
          stepId: 'label',
          order: 1,
          instruction: 'Photograph the shipping label clearly',
          instructionLocalized: {
            es: 'Fotografía la etiqueta de envío claramente',
            he: 'צלם את תווית המשלוח בבירור'
          },
          overlayGuideUrl: 'https://cdn.packageguard.io/guides/label_overlay.png',
          required: true,
          tips: ['Ensure barcode is visible', 'Avoid glare']
        }
      ],
      nonceDisplay: {
        format: 'LARGE_OVERLAY',
        position: 'TOP_CENTER',
        backgroundColor: '#FEF3C7',
        textColor: '#92400E'
      },
      validation: {
        minPhotos: 3,
        maxPhotos: 10,
        minResolution: 1280,
        maxFileSizeMb: 10,
        allowedFormats: ['JPEG', 'HEIC']
      },
      timeout: {
        nonceValiditySeconds: 300,
        showCountdown: true,
        warningAtSeconds: 60
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAppConfig,
  getCaptureConfig
};

