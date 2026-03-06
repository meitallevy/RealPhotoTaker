/**
 * DTO describing default values to use for capture (e.g. default timeout, default step order).
 */
package io.packageguard.app.data.remote.dto;

public class CaptureDefaultsConfig {
    public int minPhotos;
    public int maxPhotos;
    public int timeoutSeconds;
    public boolean allowFlash;
}

