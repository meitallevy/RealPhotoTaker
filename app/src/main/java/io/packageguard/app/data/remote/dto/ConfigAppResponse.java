/**
 * DTO combining all configuration needed by the app at startup (features, capture, legal, etc.).
 */
package io.packageguard.app.data.remote.dto;

public class ConfigAppResponse {
    public String minimumAppVersion;
    public boolean forceUpdate;
    public String updateUrl;
    public boolean maintenanceMode;
    public String maintenanceMessage;
    public FeaturesConfig features;
    public CaptureDefaultsConfig captureDefaults;
    public LegalConfig legal;
}

