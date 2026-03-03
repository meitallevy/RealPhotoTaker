package io.packageguard.app.presentation.claim;

import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import io.packageguard.app.R;

public class BuyerClaimStatusActivity extends AppCompatActivity {

    public static final String EXTRA_CLAIM_ID         = "extra_claim_id";
    public static final String EXTRA_STATUS           = "extra_status";
    public static final String EXTRA_VERIFICATION_URL = "extra_verification_url";

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_buyer_claim_status);

        String claimId          = getIntent().getStringExtra(EXTRA_CLAIM_ID);
        String status           = getIntent().getStringExtra(EXTRA_STATUS);
        String verificationUrl  = getIntent().getStringExtra(EXTRA_VERIFICATION_URL);

        TextView textStatusChip  = findViewById(R.id.textStatusChip);
        TextView textStatusMsg   = findViewById(R.id.textStatusMessage);
        TextView textClaimId     = findViewById(R.id.textClaimIdValue);
        Button   buttonViewReport = findViewById(R.id.buttonViewReport);
        Button   buttonOk        = findViewById(R.id.buttonOk);
        Button   buttonBack      = findViewById(R.id.buttonBack);

        // Populate claim ID
        textClaimId.setText(claimId != null ? claimId : "—");

        // Apply status chip
        applyStatusChip(textStatusChip, status);

        // Status-dependent message
        textStatusMsg.setText(statusMessage(status));

        // Show "View Report" when evidence is processed (AWAITING_DECISION or COMPLETED) and URL is available
        if (("COMPLETED".equalsIgnoreCase(status) || "AWAITING_DECISION".equalsIgnoreCase(status))
                && verificationUrl != null && !verificationUrl.isEmpty()) {
            buttonViewReport.setVisibility(View.VISIBLE);
            buttonViewReport.setOnClickListener(v -> {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(verificationUrl));
                startActivity(browserIntent);
            });
        }

        buttonOk.setOnClickListener(v -> finish());
        buttonBack.setOnClickListener(v -> finish());
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

    private static void applyStatusChip(TextView tv, String status) {
        String label;
        int bg, fg;
        switch (status == null ? "" : status.toUpperCase()) {
            case "COMPLETED":
                label = "Decision Made";
                bg = Color.parseColor("#E8F5E9"); fg = Color.parseColor("#1B5E20"); break;
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
        tv.setText(label);
        GradientDrawable drawable = new GradientDrawable();
        drawable.setShape(GradientDrawable.RECTANGLE);
        drawable.setCornerRadius(999f);
        drawable.setColor(bg);
        tv.setBackground(drawable);
        tv.setTextColor(fg);
    }
}
