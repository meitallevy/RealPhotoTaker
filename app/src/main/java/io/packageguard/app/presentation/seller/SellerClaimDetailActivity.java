/**
 * Detail screen for a single buyer claim as seen by the seller.
 * Shows photos, metadata, and current decision, and allows the seller to approve or reject.
 */
package io.packageguard.app.presentation.seller;

import android.app.Dialog;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.model.GlideUrl;
import com.bumptech.glide.load.model.LazyHeaders;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

import dagger.hilt.android.AndroidEntryPoint;
import io.packageguard.app.R;
import io.packageguard.app.data.remote.dto.ClaimDetailResponse;

@AndroidEntryPoint
public class SellerClaimDetailActivity extends AppCompatActivity {

    public static final String EXTRA_CLAIM_ID = "extra_claim_id";

    private SellerClaimDetailViewModel viewModel;
    private String claimId;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_seller_claim_detail);

        claimId = getIntent().getStringExtra(EXTRA_CLAIM_ID);
        if (claimId == null) {
            finish();
            return;
        }

        viewModel = new ViewModelProvider(this).get(SellerClaimDetailViewModel.class);

        // ── Claim info views
        TextView textClaimId   = findViewById(R.id.textDetailClaimId);
        TextView textOrderId   = findViewById(R.id.textDetailOrderId);
        TextView textStatus    = findViewById(R.id.textDetailStatus);
        TextView textNotes     = findViewById(R.id.textDetailNotes);
        ProgressBar progress   = findViewById(R.id.progressBarDetail);
        TextView textNoPhotos  = findViewById(R.id.textNoPhotos);
        RecyclerView recycler  = findViewById(R.id.recyclerPhotos);

        // ── Review section views
        TextView textViewedStatus  = findViewById(R.id.textViewedStatus);
        TextView textDecisionBadge = findViewById(R.id.textDecisionBadge);
        TextView textExistingNote  = findViewById(R.id.textExistingNote);
        TextInputEditText editNote = findViewById(R.id.editSellerNote);
        Button btnApprove          = findViewById(R.id.buttonApprove);
        Button btnReject           = findViewById(R.id.buttonReject);
        Button btnMoreInfo         = findViewById(R.id.buttonMoreInfo);
        ProgressBar progressReview = findViewById(R.id.progressReview);

        EvidencePhotoAdapter adapter = new EvidencePhotoAdapter(
                (imageUrl, bearer) -> showFullScreen(imageUrl, bearer));
        recycler.setLayoutManager(new GridLayoutManager(this, 2));
        recycler.setAdapter(adapter);

        findViewById(R.id.buttonBack).setOnClickListener(v -> finish());

        // ── Loading
        viewModel.getLoading().observe(this, loading ->
                progress.setVisibility(loading ? View.VISIBLE : View.GONE));

        // ── Error
        viewModel.getError().observe(this, err -> {
            if (err != null && !err.isEmpty()) {
                Toast.makeText(this, err, Toast.LENGTH_LONG).show();
            }
        });

        // ── Detail loaded
        viewModel.getDetail().observe(this, response -> {
            if (response == null) return;
            ClaimDetailResponse.ClaimDetail claim = response.claim;
            if (claim != null) {
                textClaimId.setText(claim.claimId);
                textOrderId.setText("Order: " + claim.orderId);
                applyChip(textStatus, claim.status);
                if (claim.buyerNotes != null && !claim.buyerNotes.isEmpty()) {
                    textNotes.setText("Buyer notes: " + claim.buyerNotes);
                    textNotes.setVisibility(View.VISIBLE);
                } else {
                    textNotes.setVisibility(View.GONE);
                }

                // Viewed status
                textViewedStatus.setText(claim.sellerViewedAt != null
                        ? "Viewed \u2713" : "Not yet viewed");

                // Existing decision
                if (claim.sellerDecision != null) {
                    textDecisionBadge.setVisibility(View.VISIBLE);
                    applyDecisionChip(textDecisionBadge, claim.sellerDecision);
                } else {
                    textDecisionBadge.setVisibility(View.GONE);
                }

                // Existing note (read-only display)
                if (claim.sellerNote != null && !claim.sellerNote.isEmpty()) {
                    textExistingNote.setText("\u201C" + claim.sellerNote + "\u201D");
                    textExistingNote.setVisibility(View.VISIBLE);
                } else {
                    textExistingNote.setVisibility(View.GONE);
                }
            }

            boolean hasPhotos = response.evidence != null && !response.evidence.isEmpty();
            textNoPhotos.setVisibility(hasPhotos ? View.GONE : View.VISIBLE);
            if (hasPhotos) {
                adapter.setPhotos(response.evidence, viewModel.getBearerToken());
            }
        });

        // ── Review buttons
        btnApprove.setOnClickListener(v ->
                submitReview("APPROVED", editNote, progressReview, btnApprove, btnReject, btnMoreInfo));
        btnReject.setOnClickListener(v ->
                submitReview("REJECTED", editNote, progressReview, btnApprove, btnReject, btnMoreInfo));
        btnMoreInfo.setOnClickListener(v ->
                submitReview("MORE_INFO_REQUESTED", editNote, progressReview, btnApprove, btnReject, btnMoreInfo));

        // ── Review loading
        viewModel.getReviewLoading().observe(this, loading -> {
            progressReview.setVisibility(loading ? View.VISIBLE : View.GONE);
            btnApprove.setEnabled(!loading);
            btnReject.setEnabled(!loading);
            btnMoreInfo.setEnabled(!loading);
        });

        // ── Review result
        viewModel.getReviewResult().observe(this, result -> {
            if (result == null) return;
            Toast.makeText(this, "Decision saved: " + result.decision, Toast.LENGTH_SHORT).show();
            viewModel.loadDetail(claimId); // refresh to show updated badge
        });

        // ── Review error
        viewModel.getReviewError().observe(this, err -> {
            if (err != null && !err.isEmpty()) {
                Toast.makeText(this, err, Toast.LENGTH_LONG).show();
            }
        });

        viewModel.loadDetail(claimId);
    }

    private void submitReview(String decision, TextInputEditText editNote,
                               ProgressBar progress, Button... buttons) {
        String note = editNote.getText() != null ? editNote.getText().toString().trim() : "";
        viewModel.submitReview(claimId, decision, note.isEmpty() ? null : note);
    }

    /** Apply a colored rounded chip style to a TextView based on claim status. */
    private void applyChip(TextView tv, String status) {
        tv.setText(status);
        int bg, fg;
        switch (status == null ? "" : status.toUpperCase()) {
            case "COMPLETED":
                bg = Color.parseColor("#E8F5E9"); fg = Color.parseColor("#1B5E20"); break;
            case "PROCESSING":
            case "UPLOADING":
                bg = Color.parseColor("#E3F2FD"); fg = Color.parseColor("#1565C0"); break;
            case "FAILED":
            case "EXPIRED":
                bg = Color.parseColor("#FFEBEE"); fg = Color.parseColor("#B71C1C"); break;
            default: // PENDING
                bg = Color.parseColor("#FFF3E0"); fg = Color.parseColor("#E65100"); break;
        }
        applyRoundedBg(tv, bg, fg);
    }

    /** Apply a colored rounded chip style based on seller decision. */
    private void applyDecisionChip(TextView tv, String decision) {
        int bg, fg;
        switch (decision == null ? "" : decision.toUpperCase()) {
            case "APPROVED":
                tv.setText("Approved \u2713");
                bg = Color.parseColor("#E8F5E9"); fg = Color.parseColor("#1B5E20"); break;
            case "REJECTED":
                tv.setText("Rejected \u2717");
                bg = Color.parseColor("#FFEBEE"); fg = Color.parseColor("#B71C1C"); break;
            default: // MORE_INFO_REQUESTED
                tv.setText("More Info Requested");
                bg = Color.parseColor("#FFF3E0"); fg = Color.parseColor("#E65100"); break;
        }
        applyRoundedBg(tv, bg, fg);
    }

    private static void applyRoundedBg(TextView tv, int bgColor, int textColor) {
        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.RECTANGLE);
        bg.setCornerRadius(999f);
        bg.setColor(bgColor);
        tv.setBackground(bg);
        tv.setTextColor(textColor);
    }

    private void showFullScreen(String imageUrl, String bearer) {
        Dialog dialog = new Dialog(this, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_fullscreen_photo);

        ImageView imageView = dialog.findViewById(R.id.imageFull);
        if (bearer != null) {
            GlideUrl url = new GlideUrl(imageUrl,
                    new LazyHeaders.Builder()
                            .addHeader("Authorization", bearer)
                            .build());
            Glide.with(this).load(url).into(imageView);
        }
        imageView.setOnClickListener(v -> dialog.dismiss());
        dialog.show();
    }
}
