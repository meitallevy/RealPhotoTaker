package io.packageguard.app.presentation.claim;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.lifecycle.ViewModelProvider;

import com.google.common.util.concurrent.ListenableFuture;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutionException;

import dagger.hilt.android.AndroidEntryPoint;
import io.packageguard.app.R;
import io.packageguard.app.data.remote.dto.CaptureStepDto;

@AndroidEntryPoint
public class GuidedCaptureActivity extends AppCompatActivity {

    public static final int REQUEST_CAPTURE = 2001;
    private static final int CAMERA_PERMISSION_REQUEST = 1001;

    public static final String EXTRA_CLAIM_ID = "claimId";
    public static final String EXTRA_NONCE = "nonce";
    public static final String EXTRA_NONCE_EXPIRES_AT = "nonceExpiresAt";
    public static final String EXTRA_STEPS_JSON = "stepsJson";
    public static final String EXTRA_MIN_PHOTOS = "minPhotos";
    public static final String EXTRA_SELLER_ID = "sellerId";
    public static final String RESULT_FILE_PATHS = "filePaths";

    private PreviewView previewView;
    private TextView textInstruction;
    private TextView textStepProgress;
    private LinearLayout thumbnailContainer;
    private Button buttonCapture;
    private Button buttonDone;

    private ImageCapture imageCapture;

    private String claimId;
    private List<CaptureStepDto> steps;
    private int currentStep = 0;
    private int minPhotos = 1;
    private final List<String> capturedPaths = new ArrayList<>();

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_guided_capture);

        previewView = findViewById(R.id.previewView);
        textInstruction = findViewById(R.id.textInstruction);
        textStepProgress = findViewById(R.id.textStepProgress);
        thumbnailContainer = findViewById(R.id.thumbnailContainer);
        buttonCapture = findViewById(R.id.buttonCapture);
        buttonDone = findViewById(R.id.buttonDone);

        claimId = getIntent().getStringExtra(EXTRA_CLAIM_ID);
        String nonce = getIntent().getStringExtra(EXTRA_NONCE);
        String nonceExpiresAt = getIntent().getStringExtra(EXTRA_NONCE_EXPIRES_AT);
        minPhotos = getIntent().getIntExtra(EXTRA_MIN_PHOTOS, 1);

        steps = buildDefaultSteps();

        updateStepUI();

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {
            startCamera();
        } else {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
        }

        buttonCapture.setOnClickListener(v -> capturePhoto());
        buttonDone.setOnClickListener(v -> finishCapture());
        updateDoneButton();
    }

    private List<CaptureStepDto> buildDefaultSteps() {
        List<CaptureStepDto> list = new ArrayList<>();

        CaptureStepDto s1 = new CaptureStepDto();
        s1.stepId = "label";
        s1.order = 1;
        s1.instruction = "Photograph the shipping label clearly";
        s1.required = true;
        list.add(s1);

        CaptureStepDto s2 = new CaptureStepDto();
        s2.stepId = "front";
        s2.order = 2;
        s2.instruction = "Show the front of the package";
        s2.required = true;
        list.add(s2);

        CaptureStepDto s3 = new CaptureStepDto();
        s3.stepId = "back";
        s3.order = 3;
        s3.instruction = "Show the back of the package";
        s3.required = true;
        list.add(s3);

        CaptureStepDto s4 = new CaptureStepDto();
        s4.stepId = "damage";
        s4.order = 4;
        s4.instruction = "Show any visible damage (if applicable)";
        s4.required = false;
        list.add(s4);

        return list;
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> future = ProcessCameraProvider.getInstance(this);
        future.addListener(() -> {
            try {
                ProcessCameraProvider provider = future.get();

                Preview preview = new Preview.Builder().build();
                preview.setSurfaceProvider(previewView.getSurfaceProvider());

                imageCapture = new ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build();

                provider.unbindAll();
                provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA,
                        preview, imageCapture);

            } catch (ExecutionException | InterruptedException e) {
                Toast.makeText(this, "Camera error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void capturePhoto() {
        if (imageCapture == null) {
            Toast.makeText(this, "Camera not ready", Toast.LENGTH_SHORT).show();
            return;
        }

        String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        File photoFile = new File(getCacheDir(), "evidence_" + currentStep + "_" + timestamp + ".jpg");

        ImageCapture.OutputFileOptions options =
                new ImageCapture.OutputFileOptions.Builder(photoFile).build();

        imageCapture.takePicture(options, ContextCompat.getMainExecutor(this),
                new ImageCapture.OnImageSavedCallback() {
                    @Override
                    public void onImageSaved(@NonNull ImageCapture.OutputFileResults results) {
                        capturedPaths.add(photoFile.getAbsolutePath());
                        addThumbnail(photoFile);

                        if (currentStep < steps.size() - 1) {
                            currentStep++;
                            updateStepUI();
                        }
                        updateDoneButton();
                    }

                    @Override
                    public void onError(@NonNull ImageCaptureException exception) {
                        Toast.makeText(GuidedCaptureActivity.this,
                                "Capture failed: " + exception.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void addThumbnail(File file) {
        float density = getResources().getDisplayMetrics().density;
        int size = (int) (80 * density);

        ImageView thumb = new ImageView(this);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(size, size);
        params.setMargins(4, 0, 4, 0);
        thumb.setLayoutParams(params);
        thumb.setScaleType(ImageView.ScaleType.CENTER_CROP);

        Bitmap bitmap = BitmapFactory.decodeFile(file.getAbsolutePath());
        if (bitmap != null) thumb.setImageBitmap(bitmap);

        thumbnailContainer.addView(thumb);
    }

    private void updateStepUI() {
        if (steps != null && currentStep < steps.size()) {
            CaptureStepDto step = steps.get(currentStep);
            textInstruction.setText(step.instruction);
            textStepProgress.setText(
                    getString(R.string.step_progress, currentStep + 1, steps.size()));
        }
    }

    private void updateDoneButton() {
        boolean canFinish = capturedPaths.size() >= minPhotos;
        buttonDone.setEnabled(canFinish);
        buttonDone.setAlpha(canFinish ? 1.0f : 0.5f);
    }

    private void finishCapture() {
        Intent result = new Intent();
        result.putStringArrayListExtra(RESULT_FILE_PATHS, new ArrayList<>(capturedPaths));
        result.putExtra(EXTRA_CLAIM_ID, claimId);
        setResult(RESULT_OK, result);
        finish();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST
                && grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startCamera();
        } else {
            Toast.makeText(this, "Camera permission required", Toast.LENGTH_LONG).show();
            finish();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
    }
}
