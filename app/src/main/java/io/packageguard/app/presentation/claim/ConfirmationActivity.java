/**
 * Simple confirmation screen shown to the buyer after completing the claim flow.
 * Summarises what was submitted and may show next steps or a verification link.
 */
package io.packageguard.app.presentation.claim;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import dagger.hilt.android.AndroidEntryPoint;
import io.packageguard.app.R;
import io.packageguard.app.presentation.role.RoleSelectionActivity;

@AndroidEntryPoint
public class ConfirmationActivity extends AppCompatActivity {

    public static final String EXTRA_CLAIM_ID = "claimId";
    public static final String EXTRA_STATUS = "status";

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_confirmation);

        String claimId = getIntent().getStringExtra(EXTRA_CLAIM_ID);
        String status = getIntent().getStringExtra(EXTRA_STATUS);

        TextView textClaimId = findViewById(R.id.textConfirmClaimId);
        TextView textStatus = findViewById(R.id.textConfirmStatus);
        TextView textVerifyUrl = findViewById(R.id.textVerifyUrl);
        Button buttonCopyUrl = findViewById(R.id.buttonCopyUrl);
        Button buttonDone = findViewById(R.id.buttonDone);

        String verifyUrl = "https://verify.packageguard.io/" + claimId;

        textClaimId.setText("Claim ID: " + claimId);
        textStatus.setText("Status: " + (status != null ? status : "PROCESSING"));
        textVerifyUrl.setText(verifyUrl);

        buttonCopyUrl.setOnClickListener(v -> {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                cm.setPrimaryClip(ClipData.newPlainText("Verification URL", verifyUrl));
                Toast.makeText(this, "URL copied", Toast.LENGTH_SHORT).show();
            }
        });

        buttonDone.setOnClickListener(v -> {
            Intent intent = new Intent(this, RoleSelectionActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            finish();
        });
    }
}
