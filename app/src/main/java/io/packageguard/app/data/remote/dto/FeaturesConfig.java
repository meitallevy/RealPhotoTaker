/**
 * DTO that toggles optional app features (such as AI analysis or extra capture steps).
 */
package io.packageguard.app.data.remote.dto;

public class FeaturesConfig {
    public boolean videoCapture;
    public boolean qrScanning;
    public boolean biometricAuth;
    public boolean darkMode;
}

