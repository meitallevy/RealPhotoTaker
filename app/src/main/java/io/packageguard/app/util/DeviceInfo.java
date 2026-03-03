package io.packageguard.app.util;

import android.content.Context;
import android.os.Build;
import android.provider.Settings;

public final class DeviceInfo {

    private DeviceInfo() {}

    public static String getDeviceId(Context context) {
        String androidId = Settings.Secure.getString(
                context.getContentResolver(), Settings.Secure.ANDROID_ID);
        return "android-" + (androidId != null ? androidId : "unknown");
    }

    public static String getDeviceModel() {
        return Build.MANUFACTURER + " " + Build.MODEL;
    }

    public static String getOsVersion() {
        return Build.VERSION.RELEASE;
    }
}
