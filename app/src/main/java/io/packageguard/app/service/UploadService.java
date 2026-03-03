package io.packageguard.app.service;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.File;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Foreground service that uploads evidence files to the server in the background.
 * Starts after the user taps Submit in ReviewSubmitActivity.
 */
public class UploadService extends Service {

    public static final String EXTRA_CLAIM_ID = "claimId";
    public static final String EXTRA_FILE_PATHS = "filePaths";
    public static final String EXTRA_ACCESS_TOKEN = "accessToken";
    public static final String EXTRA_SERVER_URL = "serverUrl";
    public static final String EXTRA_BUYER_NOTES = "buyerNotes";

    private static final String CHANNEL_ID = "packageguard_upload";
    private static final int NOTIFICATION_ID = 1001;

    private ExecutorService executor;
    private OkHttpClient httpClient;

    @Override
    public void onCreate() {
        super.onCreate();
        executor = Executors.newSingleThreadExecutor();
        httpClient = new OkHttpClient.Builder()
                .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .build();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String claimId = intent.getStringExtra(EXTRA_CLAIM_ID);
        ArrayList<String> filePaths = intent.getStringArrayListExtra(EXTRA_FILE_PATHS);
        String accessToken = intent.getStringExtra(EXTRA_ACCESS_TOKEN);
        String serverUrl = intent.getStringExtra(EXTRA_SERVER_URL);
        String buyerNotes = intent.getStringExtra(EXTRA_BUYER_NOTES);

        int total = filePaths != null ? filePaths.size() : 0;
        startForeground(NOTIFICATION_ID, buildNotification("Starting upload...", 0, total));

        executor.execute(() -> {
            if (claimId != null && filePaths != null && serverUrl != null) {
                uploadAllFiles(claimId, filePaths, accessToken, serverUrl, buyerNotes);
            }
            stopSelf(startId);
        });

        return START_NOT_STICKY;
    }

    private void uploadAllFiles(String claimId, ArrayList<String> filePaths,
                                String accessToken, String serverUrl, String buyerNotes) {
        int total = filePaths.size();
        int uploaded = 0;

        for (String path : filePaths) {
            File file = new File(path);
            if (!file.exists()) continue;

            try {
                updateNotification("Uploading " + (uploaded + 1) + " of " + total, uploaded, total);
                uploadFile(claimId, file, uploaded + 1, accessToken, serverUrl);
                uploaded++;
            } catch (Exception e) {
                // Continue on individual file error
            }
        }

        try {
            updateNotification("Finalizing...", total, total);
            completeClaim(claimId, total, buyerNotes, accessToken, serverUrl);
        } catch (Exception e) {
            // Log error
        }

        updateNotification("Upload complete", total, total);
    }

    private void uploadFile(String claimId, File file, int sequence,
                            String accessToken, String serverUrl) throws Exception {
        String metadata = "{\"sequenceNumber\":" + sequence + ",\"capturedAt\":\""
                + new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(new java.util.Date())
                + "\"}";

        RequestBody fileBody = RequestBody.create(file, MediaType.parse("image/jpeg"));
        MultipartBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", file.getName(), fileBody)
                .addFormDataPart("metadata", metadata)
                .build();

        Request.Builder builder = new Request.Builder()
                .url(serverUrl + "/v1/claims/" + claimId + "/evidence")
                .post(requestBody);

        if (accessToken != null && !accessToken.isEmpty()) {
            builder.header("Authorization", "Bearer " + accessToken);
        }

        try (Response response = httpClient.newCall(builder.build()).execute()) {
            if (!response.isSuccessful()) {
                throw new Exception("Upload failed: " + response.code());
            }
        }
    }

    private void completeClaim(String claimId, int totalCount, String buyerNotes,
                               String accessToken, String serverUrl) throws Exception {
        String notes = buyerNotes != null ? buyerNotes.replace("\"", "\\\"") : "";
        String json = "{\"totalEvidenceCount\":" + totalCount + ",\"buyerNotes\":\"" + notes + "\"}";

        Request.Builder builder = new Request.Builder()
                .url(serverUrl + "/v1/claims/" + claimId + "/complete")
                .post(RequestBody.create(json, MediaType.parse("application/json")));

        if (accessToken != null && !accessToken.isEmpty()) {
            builder.header("Authorization", "Bearer " + accessToken);
        }

        try (Response response = httpClient.newCall(builder.build()).execute()) {
            // Accept any 2xx response
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Evidence Upload", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Uploading package evidence to PackageGuard");
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(String text, int progress, int max) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("PackageGuard — Uploading Evidence")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_upload)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        if (max > 0) {
            builder.setProgress(max, progress, false);
        }

        return builder.build();
    }

    private void updateNotification(String text, int progress, int max) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification(text, progress, max));
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        executor.shutdown();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
