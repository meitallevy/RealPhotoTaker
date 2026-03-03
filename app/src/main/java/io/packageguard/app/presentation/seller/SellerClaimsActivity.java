package io.packageguard.app.presentation.seller;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import dagger.hilt.android.AndroidEntryPoint;
import io.packageguard.app.R;

@AndroidEntryPoint
public class SellerClaimsActivity extends AppCompatActivity {

    private SellerClaimsViewModel viewModel;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_seller_claims);

        viewModel = new ViewModelProvider(this).get(SellerClaimsViewModel.class);

        RecyclerView recyclerView = findViewById(R.id.recyclerClaims);
        ProgressBar progressBar = findViewById(R.id.progressBarClaims);
        TextView textEmpty = findViewById(R.id.textEmptyClaims);
        TextView tabOpen = findViewById(R.id.tabOpen);
        TextView tabResolved = findViewById(R.id.tabResolved);

        ClaimsAdapter adapter = new ClaimsAdapter(item -> {
            Intent intent = new Intent(this, SellerClaimDetailActivity.class);
            intent.putExtra(SellerClaimDetailActivity.EXTRA_CLAIM_ID, item.claimId);
            startActivity(intent);
        });

        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        recyclerView.setAdapter(adapter);

        viewModel.getLoading().observe(this, loading -> {
            progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
        });

        viewModel.getStatusMessage().observe(this, msg -> {
            if (msg != null && !msg.isEmpty()) {
                Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
            }
        });

        viewModel.getClaimsList().observe(this, response -> {
            if (response != null && response.claims != null) {
                adapter.setAllClaims(response.claims);
                textEmpty.setVisibility(response.claims.isEmpty() ? View.VISIBLE : View.GONE);
            }
        });

        // Simple client-side tabs: Open vs Resolved (approved/rejected)
        tabOpen.setOnClickListener(v -> {
            adapter.showOpen();
            tabOpen.setTextColor(getResources().getColor(R.color.text_primary));
            tabResolved.setTextColor(getResources().getColor(R.color.text_secondary));
        });
        tabResolved.setOnClickListener(v -> {
            adapter.showResolved();
            tabResolved.setTextColor(getResources().getColor(R.color.text_primary));
            tabOpen.setTextColor(getResources().getColor(R.color.text_secondary));
        });

        // Default to Open tab
        adapter.showOpen();

        viewModel.loadClaims();
    }
}
