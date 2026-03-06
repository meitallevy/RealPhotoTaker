/**
 * DTO defining how long the app should wait for user actions during capture (timeouts).
 */
package io.packageguard.app.data.remote.dto;

public class CaptureTimeoutDto {
    public int nonceValiditySeconds;
    public boolean showCountdown;
    public int warningAtSeconds;
}

