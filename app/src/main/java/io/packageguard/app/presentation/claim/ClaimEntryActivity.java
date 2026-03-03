package io.packageguard.app.presentation.claim;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.google.gson.Gson;

import java.util.List;

import dagger.hilt.android.AndroidEntryPoint;
import io.packageguard.app.R;
import io.packageguard.app.data.remote.dto.CaptureStepDto;
import io.packageguard.app.data.remote.dto.ClaimInitiateResponse;

@AndroidEntryPoint
public class ClaimEntryActivity extends AppCompatActivity {

    private ClaimEntryViewModel viewModel;
    private EditText editSellerId;
    private EditText editOrderId;
    private ProgressBar progressBar;
    private TextView textStatus;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_claim_entry);

        viewModel = new ViewModelProvider(this).get(ClaimEntryViewModel.class);

        editSellerId = findViewById(R.id.editSellerId);
        editOrderId = findViewById(R.id.editOrderId);
        progressBar = findViewById(R.id.progressBarClaim);
        textStatus = findViewById(R.id.textClaimStatus);

        Button buttonStart = findViewById(R.id.buttonStartClaim);

        // Handle deep link: packageguard://claim?seller=sel_xxx
        Uri data = getIntent().getData();
        if (data != null && "packageguard".equals(data.getScheme())) {
            String sellerId = data.getQueryParameter("seller");
            if (sellerId != null) editSellerId.setText(sellerId);
        }

        // Pre-fill sellerId from intent extra (e.g. from dashboard QR share)
        String sellerIdExtra = getIntent().getStringExtra("sellerId");
        if (sellerIdExtra != null && !sellerIdExtra.isEmpty()) {
            editSellerId.setText(sellerIdExtra);
        }

        buttonStart.setOnClickListener(v -> {
            String sellerId = editSellerId.getText().toString().trim();
            String orderId = editOrderId.getText().toString().trim();
            viewModel.startClaim(sellerId, orderId);
        });

        viewModel.getLoading().observe(this, loading -> {
            progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
            buttonStart.setEnabled(!loading);
        });

        viewModel.getStatusMessage().observe(this, textStatus::setText);

        viewModel.getClaimInitiated().observe(this, this::onClaimInitiated);
    }

    private void onClaimInitiated(ClaimInitiateResponse response) {
        // Fetch capture config, then launch guided capture
        Intent intent = new Intent(this, GuidedCaptureActivity.class);
        intent.putExtra(GuidedCaptureActivity.EXTRA_CLAIM_ID, response.claimId);
        intent.putExtra(GuidedCaptureActivity.EXTRA_NONCE, response.nonce);
        intent.putExtra(GuidedCaptureActivity.EXTRA_NONCE_EXPIRES_AT, response.nonceExpiresAt);
        intent.putExtra(GuidedCaptureActivity.EXTRA_MIN_PHOTOS, 1);

        // Pass seller ID so GuidedCapture can fetch config
        String sellerId = editSellerId.getText().toString().trim();
        intent.putExtra(GuidedCaptureActivity.EXTRA_SELLER_ID, sellerId);

        startActivityForResult(intent, GuidedCaptureActivity.REQUEST_CAPTURE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == GuidedCaptureActivity.REQUEST_CAPTURE && resultCode == RESULT_OK && data != null) {
            String claimId = data.getStringExtra(GuidedCaptureActivity.EXTRA_CLAIM_ID);
            java.util.ArrayList<String> filePaths =
                    data.getStringArrayListExtra(GuidedCaptureActivity.RESULT_FILE_PATHS);

            Intent reviewIntent = new Intent(this, ReviewSubmitActivity.class);
            reviewIntent.putExtra(ReviewSubmitActivity.EXTRA_CLAIM_ID, claimId);
            reviewIntent.putStringArrayListExtra(ReviewSubmitActivity.EXTRA_FILE_PATHS, filePaths);
            startActivity(reviewIntent);
        }
    }
}
