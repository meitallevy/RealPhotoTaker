/**
 * DTO that mirrors the basic device information sent with a claim.
 * Built from values provided by the DeviceInfo utility class.
 */
package io.packageguard.app.data.remote.dto;

public class DeviceInfoDto {
    public String platform;
    public String osVersion;
    public String appVersion;
    public String deviceModel;
    public String deviceId;
}

