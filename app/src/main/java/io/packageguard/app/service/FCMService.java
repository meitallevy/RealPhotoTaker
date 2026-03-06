/**
 * Firebase Cloud Messaging service hook for the app.
 * Receives push notifications (e.g. claim updates) and can route them into local UI or storage.
 */
package io.packageguard.app.service;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Stub for Firebase Cloud Messaging integration.
 *
 * To enable push notifications:
 * 1. Add 'com.google.firebase:firebase-messaging:23.4.0' to app/build.gradle
 * 2. Apply 'com.google.gms.google-services' plugin
 * 3. Add google-services.json to the app/ directory
 * 4. Change this class to extend FirebaseMessagingService
 * 5. Override onNewToken() to send the token to the server
 * 6. Override onMessageReceived() to handle incoming messages
 */
public class FCMService extends Service {

    private static final String CHANNEL_ID = "packageguard_notifications";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_NOT_STICKY;
    }

    public void showNotification(String title, String body) {
        createNotificationChannel();

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(body)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify((int) (System.currentTimeMillis() % 10000), builder.build());
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "PackageGuard Notifications", NotificationManager.IMPORTANCE_DEFAULT);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
