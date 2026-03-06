/**
 * Activity that lets a buyer provide additional text context or clarifications for a claim.
 * Sends the extra information to the backend so the seller can review it alongside photos.
 */
package io.packageguard.app.presentation.claim;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import io.packageguard.app.R;

public class BuyerMoreInfoActivity extends AppCompatActivity {

    public static final String EXTRA_CLAIM_ID = "claimId";
    public static final String EXTRA_NONCE = "nonce";
    public static final String EXTRA_NONCE_EXPIRES_AT = "nonceExpiresAt";
    public static final String EXTRA_SELLER_NOTE = "sellerNote";
    public static final String EXTRA_SELLER_ID = "sellerId";
    public static final String EXTRA_ORDER_ID = "orderId";

    private String claimId;
    private String nonce;
    private String nonceExpiresAt;
    private String sellerNote;
    private String sellerId;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_buyer_more_info);

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
        Button buttonAddMore = findViewById(R.id.buttonAddMore);
        Button buttonCancel = findViewById(R.id.buttonCancel);

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

        buttonAddMore.setOnClickListener(v -> {
            Intent intent = new Intent(this, GuidedCaptureActivity.class);
            intent.putExtra(GuidedCaptureActivity.EXTRA_CLAIM_ID, claimId);
            intent.putExtra(GuidedCaptureActivity.EXTRA_NONCE, nonce);
            intent.putExtra(GuidedCaptureActivity.EXTRA_NONCE_EXPIRES_AT, nonceExpiresAt);
            intent.putExtra(GuidedCaptureActivity.EXTRA_MIN_PHOTOS, 1);
            intent.putExtra(GuidedCaptureActivity.EXTRA_SELLER_ID, sellerId);
            startActivityForResult(intent, GuidedCaptureActivity.REQUEST_CAPTURE);
        });

        buttonCancel.setOnClickListener(v -> {
            setResult(RESULT_CANCELED);
            finish();
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == GuidedCaptureActivity.REQUEST_CAPTURE) {
            // Bubble result back to the original entry activity so it can continue the flow
            setResult(resultCode, data);
            finish();
        }
    }
}

