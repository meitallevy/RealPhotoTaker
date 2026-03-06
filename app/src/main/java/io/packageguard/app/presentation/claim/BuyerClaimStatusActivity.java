/**
 * Activity that displays the current status of a buyer's claim (e.g. pending, approved, rejected).
 * Reads status information from the backend and shows a simple, read-only summary screen.
 */
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
        String sellerDecision  = getIntent().getStringExtra("sellerDecision"); // May come from status check

        TextView textStatusChip  = findViewById(R.id.textStatusChip);
        TextView textStatusMsg   = findViewById(R.id.textStatusMessage);
        TextView textClaimId     = findViewById(R.id.textClaimIdValue);
        Button   buttonViewReport = findViewById(R.id.buttonViewReport);
        Button   buttonOk        = findViewById(R.id.buttonOk);
        Button   buttonBack      = findViewById(R.id.buttonBack);

        // Populate claim ID
        textClaimId.setText(claimId != null ? claimId : "—");

        // Apply status chip (shows decision if available, otherwise status)
        applyStatusChip(textStatusChip, status, sellerDecision);

        // Status-dependent message (update if decision exists)
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
                    break;
                default:
                    textStatusMsg.setText(statusMessage(status));
            }
        } else {
            textStatusMsg.setText(statusMessage(status));
        }

        // Always show "View Report" button if we have a verification URL
        // The web page will show the current state including any decisions
        if (verificationUrl != null && !verificationUrl.isEmpty()) {
            buttonViewReport.setVisibility(View.VISIBLE);
            buttonViewReport.setText("View Full Report");
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
