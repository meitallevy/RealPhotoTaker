/**
 * Activity that displays the current status of a buyer's claim (e.g. pending, approved, rejected).
 * Fetches status from the backend API and shows a summary screen with actions when needed.
 */
package io.packageguard.app.presentation.claim;

import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import dagger.hilt.android.AndroidEntryPoint;
import io.packageguard.app.R;
import io.packageguard.app.data.remote.api.PackageGuardApi;
import io.packageguard.app.data.remote.dto.ClaimInitiateRequest;
import io.packageguard.app.data.remote.dto.ClaimInitiateResponse;
import io.packageguard.app.data.remote.dto.ClaimStatusResponse;
import io.packageguard.app.data.remote.dto.DeviceInfoDto;
import io.packageguard.app.util.DeviceInfo;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

import javax.inject.Inject;

@AndroidEntryPoint
public class BuyerClaimStatusActivity extends AppCompatActivity {

    public static final String EXTRA_CLAIM_ID         = "extra_claim_id";
    public static final String EXTRA_STATUS           = "extra_status";
    public static final String EXTRA_VERIFICATION_URL = "extra_verification_url";

    @Inject
    PackageGuardApi api;

    private BuyerClaimStatusViewModel viewModel;
    private String currentClaimId;
    private String currentOrderId;
    private String currentSellerId;
    private String currentSellerNote;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_buyer_claim_status);

        viewModel = new ViewModelProvider(this).get(BuyerClaimStatusViewModel.class);

        String claimId = getIntent().getStringExtra(EXTRA_CLAIM_ID);
        currentClaimId = claimId;

        TextView textStatusChip  = findViewById(R.id.textStatusChip);
        TextView textStatusMsg   = findViewById(R.id.textStatusMessage);
        TextView textClaimId     = findViewById(R.id.textClaimIdValue);
        Button   buttonViewReport = findViewById(R.id.buttonViewReport);
        Button   buttonAddMoreInfo = findViewById(R.id.buttonAddMoreInfo);
        Button   buttonOk        = findViewById(R.id.buttonOk);
        Button   buttonBack      = findViewById(R.id.buttonBack);

        // Populate claim ID
        textClaimId.setText(claimId != null ? claimId : "—");

        // Observe status from ViewModel
        viewModel.getClaimStatus().observe(this, status -> {
            if (status != null) {
                currentOrderId = status.orderId;
                currentSellerId = status.sellerId;
                currentSellerNote = status.sellerNote;
                updateUI(textStatusChip, textStatusMsg, buttonViewReport, buttonAddMoreInfo, status);
            }
        });

        viewModel.getError().observe(this, error -> {
            if (error != null && !error.isEmpty()) {
                Toast.makeText(this, error, Toast.LENGTH_LONG).show();
            }
        });

        // If we have a claimId, fetch status from API
        if (claimId != null && !claimId.isEmpty()) {
            viewModel.loadStatus(claimId);
        } else {
            // Fallback to intent extras if no claimId
            String status = getIntent().getStringExtra(EXTRA_STATUS);
            String verificationUrl = getIntent().getStringExtra(EXTRA_VERIFICATION_URL);
            String sellerDecision = getIntent().getStringExtra("sellerDecision");
            applyStatusChip(textStatusChip, status, sellerDecision);
            if (sellerDecision != null && !sellerDecision.isEmpty()) {
                switch (sellerDecision.toUpperCase()) {
                    case "APPROVED":
                        textStatusMsg.setText("Your claim has been approved by the seller.");
                        break;
                    case "REJECTED":
                        textStatusMsg.setText("Your claim has been rejected by the seller.");
                        break;
                    case "MORE_INFO_REQUESTED":
                        textStatusMsg.setText("The seller has requested additional information. Please add more photos and notes.");
                        buttonAddMoreInfo.setVisibility(View.VISIBLE);
                        break;
                    default:
                        textStatusMsg.setText(statusMessage(status));
                }
            } else {
                textStatusMsg.setText(statusMessage(status));
            }
            if (verificationUrl != null && !verificationUrl.isEmpty()) {
                buttonViewReport.setVisibility(View.VISIBLE);
                buttonViewReport.setOnClickListener(v -> {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(verificationUrl));
                    startActivity(browserIntent);
                });
            }
        }

        // Add More Info button click handler
        buttonAddMoreInfo.setOnClickListener(v -> {
            if (currentOrderId == null || currentSellerId == null) {
                Toast.makeText(this, "Unable to add more info: missing order or seller ID", Toast.LENGTH_SHORT).show();
                return;
            }
            initiateClaimForMoreInfo(currentSellerId, currentOrderId);
        });

        // View Report button
        buttonViewReport.setOnClickListener(v -> {
            ClaimStatusResponse status = viewModel.getClaimStatus().getValue();
            String url = status != null && status.verificationUrl != null
                    ? status.verificationUrl
                    : getIntent().getStringExtra(EXTRA_VERIFICATION_URL);
            if (url != null && !url.isEmpty()) {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(browserIntent);
            }
        });

        buttonOk.setOnClickListener(v -> finish());
        buttonBack.setOnClickListener(v -> finish());
    }

    private void updateUI(TextView textStatusChip, TextView textStatusMsg, Button buttonViewReport,
                          Button buttonAddMoreInfo, ClaimStatusResponse status) {
        applyStatusChip(textStatusChip, status.status, status.sellerDecision);

        if (status.sellerDecision != null && !status.sellerDecision.isEmpty()) {
            switch (status.sellerDecision.toUpperCase()) {
                case "APPROVED":
                    textStatusMsg.setText("Your claim has been approved by the seller.");
                    buttonAddMoreInfo.setVisibility(View.GONE);
                    break;
                case "REJECTED":
                    textStatusMsg.setText("Your claim has been rejected by the seller.");
                    buttonAddMoreInfo.setVisibility(View.GONE);
                    break;
                case "MORE_INFO_REQUESTED":
                    textStatusMsg.setText("The seller has requested additional information. Please add more photos and notes.");
                    buttonAddMoreInfo.setVisibility(View.VISIBLE);
                    break;
                default:
                    textStatusMsg.setText(statusMessage(status.status));
                    buttonAddMoreInfo.setVisibility(View.GONE);
            }
        } else {
            textStatusMsg.setText(statusMessage(status.status));
            buttonAddMoreInfo.setVisibility(View.GONE);
        }

        if (status.verificationUrl != null && !status.verificationUrl.isEmpty()) {
            buttonViewReport.setVisibility(View.VISIBLE);
        }
    }

    private void initiateClaimForMoreInfo(String sellerId, String orderId) {
        DeviceInfoDto deviceInfo = new DeviceInfoDto();
        deviceInfo.platform = "android";
        deviceInfo.osVersion = Build.VERSION.RELEASE;
        deviceInfo.appVersion = "1.0.0";
        deviceInfo.deviceModel = DeviceInfo.getDeviceModel();
        deviceInfo.deviceId = DeviceInfo.getDeviceId(this);

        ClaimInitiateRequest body = new ClaimInitiateRequest();
        body.sellerId = sellerId;
        body.orderId = orderId;
        body.deviceInfo = deviceInfo;

        api.initiateClaim(null, body).enqueue(new Callback<ClaimInitiateResponse>() {
            @Override
            public void onResponse(Call<ClaimInitiateResponse> call, Response<ClaimInitiateResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    ClaimInitiateResponse resp = response.body();
                    if (resp.moreInfoRequested && resp.nonce != null) {
                        // Navigate to BuyerMoreInfoActivity
                        Intent intent = new Intent(BuyerClaimStatusActivity.this, BuyerMoreInfoActivity.class);
                        intent.putExtra(BuyerMoreInfoActivity.EXTRA_CLAIM_ID, resp.claimId);
                        intent.putExtra(BuyerMoreInfoActivity.EXTRA_NONCE, resp.nonce);
                        intent.putExtra(BuyerMoreInfoActivity.EXTRA_NONCE_EXPIRES_AT, resp.nonceExpiresAt);
                        intent.putExtra(BuyerMoreInfoActivity.EXTRA_SELLER_NOTE, currentSellerNote);
                        intent.putExtra(BuyerMoreInfoActivity.EXTRA_SELLER_ID, sellerId);
                        intent.putExtra(BuyerMoreInfoActivity.EXTRA_ORDER_ID, orderId);
                        startActivity(intent);
                    } else {
                        Toast.makeText(BuyerClaimStatusActivity.this, "Unable to add more info at this time", Toast.LENGTH_SHORT).show();
                    }
                } else {
                    Toast.makeText(BuyerClaimStatusActivity.this, "Failed to initiate: " + response.code(), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ClaimInitiateResponse> call, Throwable t) {
                Toast.makeText(BuyerClaimStatusActivity.this, "Network error: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private String statusMessage(String status) {
        if (status == null) return getString(R.string.claim_status_msg_pending);
        switch (status.toUpperCase()) {
            case "COMPLETED":          return getString(R.string.claim_status_msg_completed);
            case "AWAITING_DECISION":  return getString(R.string.claim_status_msg_awaiting_decision);
            case "PROCESSING":
            case "UPLOADING":          return getString(R.string.claim_status_msg_processing);
            default:                   return getString(R.string.claim_status_msg_pending);
        }
    }

    private static void applyStatusChip(TextView tv, String status, String sellerDecision) {
        String label;
        int bg, fg;
        
        // If seller has made a decision, show that instead of status
        if (sellerDecision != null && !sellerDecision.isEmpty()) {
            switch (sellerDecision.toUpperCase()) {
                case "APPROVED":
                    label = "✓ Approved";
                    bg = Color.parseColor("#E8F5E9"); fg = Color.parseColor("#1B5E20"); break;
                case "REJECTED":
                    label = "✗ Rejected";
                    bg = Color.parseColor("#FFEBEE"); fg = Color.parseColor("#B71C1C"); break;
                case "MORE_INFO_REQUESTED":
                    label = "ℹ More Info Needed";
                    bg = Color.parseColor("#FFF3E0"); fg = Color.parseColor("#E65100"); break;
                default:
                    label = "Decision Made";
                    bg = Color.parseColor("#E8F5E9"); fg = Color.parseColor("#1B5E20"); break;
            }
        } else {
            // No decision yet - show status
            switch (status == null ? "" : status.toUpperCase()) {
                case "COMPLETED":
                    label = "Ready for Review";
                    bg = Color.parseColor("#E3F2FD"); fg = Color.parseColor("#1565C0"); break;
                case "AWAITING_DECISION":
                    label = "Waiting for reviewer";
                    bg = Color.parseColor("#FFF3E0"); fg = Color.parseColor("#E65100"); break;
                case "PROCESSING":
                case "UPLOADING":
                    label = "Processing";
                    bg = Color.parseColor("#E3F2FD"); fg = Color.parseColor("#1565C0"); break;
                default:
                    label = "Waiting for review";
                    bg = Color.parseColor("#FFF3E0"); fg = Color.parseColor("#E65100"); break;
            }
        }
        
        tv.setText(label);
        GradientDrawable drawable = new GradientDrawable();
        drawable.setShape(GradientDrawable.RECTANGLE);
        drawable.setCornerRadius(999f);
        drawable.setColor(bg);
        tv.setBackground(drawable);
        tv.setTextColor(fg);
    }
}
