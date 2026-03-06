/**
 * ReviewSubmitActivity
 *
 * Shows the buyer a thumbnail strip of captured photos and a notes field before submission.
 * Once the buyer taps "Submit", the ViewModel uploads the photos one by one and calls
 * completeClaim, then this screen navigates to ConfirmationActivity.
 *
 * Key logic:
 *   onCreate()       – displays photo thumbnails from file paths, wires up submit button
 *   onSubmitComplete() – receives the API response and launches ConfirmationActivity
 */
package io.packageguard.app.presentation.claim;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

import dagger.hilt.android.AndroidEntryPoint;
import io.packageguard.app.R;
import io.packageguard.app.data.remote.dto.ClaimCompleteResponse;

@AndroidEntryPoint
public class ReviewSubmitActivity extends AppCompatActivity {

    public static final String EXTRA_CLAIM_ID = "claimId";
    public static final String EXTRA_FILE_PATHS = "filePaths";

    private ReviewSubmitViewModel viewModel;
    private String claimId;
    private List<String> filePaths;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_review_submit);

        viewModel = new ViewModelProvider(this).get(ReviewSubmitViewModel.class);

        claimId = getIntent().getStringExtra(EXTRA_CLAIM_ID);
        filePaths = getIntent().getStringArrayListExtra(EXTRA_FILE_PATHS);
        if (filePaths == null) filePaths = new ArrayList<>();

        LinearLayout photoStrip = findViewById(R.id.photoStrip);
        EditText editNotes = findViewById(R.id.editBuyerNotes);
        Button buttonSubmit = findViewById(R.id.buttonSubmit);
        ProgressBar progressBar = findViewById(R.id.progressBarSubmit);
        TextView textStatus = findViewById(R.id.textSubmitStatus);
        TextView textProgress = findViewById(R.id.textUploadProgress);

        // Show photo thumbnails
        float density = getResources().getDisplayMetrics().density;
        int size = (int) (80 * density);
        for (String path : filePaths) {
            ImageView iv = new ImageView(this);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(size, size);
            lp.setMargins(4, 0, 4, 0);
            iv.setLayoutParams(lp);
            iv.setScaleType(ImageView.ScaleType.CENTER_CROP);
            Bitmap bm = BitmapFactory.decodeFile(path);
            if (bm != null) iv.setImageBitmap(bm);
            photoStrip.addView(iv);
        }

        buttonSubmit.setOnClickListener(v -> {
            String notes = editNotes.getText().toString().trim();
            viewModel.uploadAndSubmit(claimId, filePaths, notes);
        });

        viewModel.getLoading().observe(this, loading -> {
            progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
            buttonSubmit.setEnabled(!loading);
        });

        viewModel.getStatusMessage().observe(this, textStatus::setText);
        viewModel.getUploadProgress().observe(this, textProgress::setText);

        viewModel.getSubmitComplete().observe(this, this::onSubmitComplete);
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
