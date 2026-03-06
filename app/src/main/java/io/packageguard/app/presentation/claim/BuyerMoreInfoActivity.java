/**
 * Activity that lets a buyer provide additional photos (via camera) and notes for a claim
 * when the seller has requested more information. Allows capturing photos and adding notes,
 * then submits both to the backend.
 */
package io.packageguard.app.presentation.claim;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import java.util.ArrayList;
import java.util.List;

import dagger.hilt.android.AndroidEntryPoint;
import io.packageguard.app.R;
import io.packageguard.app.data.remote.dto.ClaimCompleteResponse;

@AndroidEntryPoint
public class BuyerMoreInfoActivity extends AppCompatActivity {

    public static final String EXTRA_CLAIM_ID = "claimId";
    public static final String EXTRA_NONCE = "nonce";
    public static final String EXTRA_NONCE_EXPIRES_AT = "nonceExpiresAt";
    public static final String EXTRA_SELLER_NOTE = "sellerNote";
    public static final String EXTRA_SELLER_ID = "sellerId";
    public static final String EXTRA_ORDER_ID = "orderId";

    private static final int REQUEST_CAPTURE = 1001;

    private String claimId;
    private String nonce;
    private String nonceExpiresAt;
    private String sellerNote;
    private String sellerId;
    private List<String> capturedPhotoPaths = new ArrayList<>();

    private ReviewSubmitViewModel viewModel;
    private EditText editNotes;
    private Button buttonAddPhotos;
    private Button buttonSubmit;
    private LinearLayout photoThumbnails;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_buyer_more_info);

        viewModel = new ViewModelProvider(this).get(ReviewSubmitViewModel.class);

        claimId = getIntent().getStringExtra(EXTRA_CLAIM_ID);
        nonce = getIntent().getStringExtra(EXTRA_NONCE);
        nonceExpiresAt = getIntent().getStringExtra(EXTRA_NONCE_EXPIRES_AT);
        sellerNote = getIntent().getStringExtra(EXTRA_SELLER_NOTE);
        sellerId = getIntent().getStringExtra(EXTRA_SELLER_ID);

        TextView textTitle = findViewById(R.id.textMoreInfoTitle);
        TextView textMessage = findViewById(R.id.textMoreInfoMessage);
        TextView textSellerNoteLabel = findViewById(R.id.textSellerNoteLabel);
        TextView textSellerNote = findViewById(R.id.textSellerNote);
        Button buttonBack = findViewById(R.id.buttonBack);
        buttonAddPhotos = findViewById(R.id.buttonAddMore);
        Button buttonCancel = findViewById(R.id.buttonCancel);
        editNotes = findViewById(R.id.editBuyerNotes);
        buttonSubmit = findViewById(R.id.buttonSubmit);
        photoThumbnails = findViewById(R.id.photoThumbnails);

        // Add notes field if it doesn't exist in layout - we'll add it programmatically if needed
        if (editNotes == null) {
            // Notes field will be added to layout
        }

        buttonBack.setOnClickListener(v -> finish());

        textTitle.setText(R.string.more_info_title);
        textMessage.setText(R.string.more_info_message);

        if (sellerNote != null && !sellerNote.isEmpty()) {
            textSellerNote.setText(sellerNote);
            textSellerNote.setVisibility(View.VISIBLE);
            textSellerNoteLabel.setVisibility(View.VISIBLE);
        } else {
            textSellerNote.setVisibility(View.GONE);
            textSellerNoteLabel.setVisibility(View.GONE);
        }

        buttonAddPhotos.setOnClickListener(v -> {
            Intent intent = new Intent(this, GuidedCaptureActivity.class);
            intent.putExtra(GuidedCaptureActivity.EXTRA_CLAIM_ID, claimId);
            intent.putExtra(GuidedCaptureActivity.EXTRA_NONCE, nonce);
            intent.putExtra(GuidedCaptureActivity.EXTRA_NONCE_EXPIRES_AT, nonceExpiresAt);
            intent.putExtra(GuidedCaptureActivity.EXTRA_MIN_PHOTOS, 1);
            intent.putExtra(GuidedCaptureActivity.EXTRA_SELLER_ID, sellerId);
            startActivityForResult(intent, REQUEST_CAPTURE);
        });

        buttonSubmit.setOnClickListener(v -> {
            if (capturedPhotoPaths.isEmpty()) {
                Toast.makeText(this, "Please add at least one photo", Toast.LENGTH_SHORT).show();
                return;
            }
            String notes = editNotes != null ? editNotes.getText().toString().trim() : "";
            viewModel.uploadAndSubmit(claimId, capturedPhotoPaths, notes);
        });

        buttonCancel.setOnClickListener(v -> {
            setResult(RESULT_CANCELED);
            finish();
        });

        viewModel.getLoading().observe(this, loading -> {
            buttonSubmit.setEnabled(!loading);
            buttonAddPhotos.setEnabled(!loading);
        });

        viewModel.getStatusMessage().observe(this, msg -> {
            if (msg != null && !msg.isEmpty()) {
                Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
            }
        });

        viewModel.getSubmitComplete().observe(this, this::onSubmitComplete);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_CAPTURE && resultCode == RESULT_OK && data != null) {
            ArrayList<String> newPaths = data.getStringArrayListExtra(GuidedCaptureActivity.RESULT_FILE_PATHS);
            if (newPaths != null && !newPaths.isEmpty()) {
                capturedPhotoPaths.addAll(newPaths);
                updatePhotoThumbnails();
            }
        }
    }

    private void updatePhotoThumbnails() {
        photoThumbnails.removeAllViews();
        float density = getResources().getDisplayMetrics().density;
        int size = (int) (80 * density);
        for (String path : capturedPhotoPaths) {
            android.widget.ImageView iv = new android.widget.ImageView(this);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(size, size);
            lp.setMargins(4, 0, 4, 0);
            iv.setLayoutParams(lp);
            iv.setScaleType(android.widget.ImageView.ScaleType.CENTER_CROP);
            android.graphics.Bitmap bm = android.graphics.BitmapFactory.decodeFile(path);
            if (bm != null) iv.setImageBitmap(bm);
            photoThumbnails.addView(iv);
        }
        buttonSubmit.setEnabled(!capturedPhotoPaths.isEmpty());
    }

    private void onSubmitComplete(ClaimCompleteResponse response) {
        Intent intent = new Intent(this, ConfirmationActivity.class);
        intent.putExtra(ConfirmationActivity.EXTRA_CLAIM_ID, response.claimId);
        intent.putExtra(ConfirmationActivity.EXTRA_STATUS, response.status);
        if (response.verificationUrl != null) {
            intent.putExtra(ConfirmationActivity.EXTRA_VERIFICATION_URL, response.verificationUrl);
        }
        startActivity(intent);
        finish();
    }
}

