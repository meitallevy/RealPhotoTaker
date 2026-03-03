package io.packageguard.app.presentation.seller;

import android.app.Dialog;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
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

import dagger.hilt.android.AndroidEntryPoint;
import io.packageguard.app.R;
import io.packageguard.app.data.remote.dto.ClaimDetailResponse;

@AndroidEntryPoint
public class SellerClaimDetailActivity extends AppCompatActivity {

    public static final String EXTRA_CLAIM_ID = "extra_claim_id";

    private SellerClaimDetailViewModel viewModel;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_seller_claim_detail);

        String claimId = getIntent().getStringExtra(EXTRA_CLAIM_ID);
        if (claimId == null) {
            finish();
            return;
        }

        viewModel = new ViewModelProvider(this).get(SellerClaimDetailViewModel.class);

        TextView textClaimId   = findViewById(R.id.textDetailClaimId);
        TextView textOrderId   = findViewById(R.id.textDetailOrderId);
        TextView textStatus    = findViewById(R.id.textDetailStatus);
        TextView textRisk      = findViewById(R.id.textDetailRisk);
        TextView textNotes     = findViewById(R.id.textDetailNotes);
        ProgressBar progress   = findViewById(R.id.progressBarDetail);
        TextView textNoPhotos  = findViewById(R.id.textNoPhotos);
        RecyclerView recycler  = findViewById(R.id.recyclerPhotos);

        EvidencePhotoAdapter adapter = new EvidencePhotoAdapter(
                (imageUrl, bearer) -> showFullScreen(imageUrl, bearer));

        recycler.setLayoutManager(new GridLayoutManager(this, 2));
        recycler.setAdapter(adapter);

        findViewById(R.id.buttonBack).setOnClickListener(v -> finish());

        viewModel.getLoading().observe(this, loading ->
                progress.setVisibility(loading ? View.VISIBLE : View.GONE));

        viewModel.getError().observe(this, err -> {
            if (err != null && !err.isEmpty()) {
                Toast.makeText(this, err, Toast.LENGTH_LONG).show();
            }
        });

        viewModel.getDetail().observe(this, response -> {
            if (response == null) return;

            ClaimDetailResponse.ClaimDetail claim = response.claim;
            if (claim != null) {
                textClaimId.setText(claim.claimId);
                textOrderId.setText("Order: " + claim.orderId);
                textStatus.setText("Status: " + claim.status);
                textRisk.setText("Risk score: " + claim.riskScore);
                if (claim.buyerNotes != null && !claim.buyerNotes.isEmpty()) {
                    textNotes.setText("Notes: " + claim.buyerNotes);
                    textNotes.setVisibility(View.VISIBLE);
                } else {
                    textNotes.setVisibility(View.GONE);
                }
            }

            boolean hasPhotos = response.evidence != null && !response.evidence.isEmpty();
            textNoPhotos.setVisibility(hasPhotos ? View.GONE : View.VISIBLE);
            if (hasPhotos) {
                adapter.setPhotos(response.evidence, viewModel.getBearerToken());
            }
        });

        viewModel.loadDetail(claimId);
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
