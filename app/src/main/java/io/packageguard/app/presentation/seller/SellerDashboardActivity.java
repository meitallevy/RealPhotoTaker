package io.packageguard.app.presentation.seller;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import dagger.hilt.android.AndroidEntryPoint;
import io.packageguard.app.R;
import io.packageguard.app.presentation.auth.LoginActivity;

@AndroidEntryPoint
public class SellerDashboardActivity extends AppCompatActivity {

    private SellerDashboardViewModel viewModel;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_seller_dashboard);

        viewModel = new ViewModelProvider(this).get(SellerDashboardViewModel.class);

        TextView textSellerName = findViewById(R.id.textSellerName);
        TextView textSellerEmail = findViewById(R.id.textSellerEmail);
        TextView textStats = findViewById(R.id.textStats);
        TextView textDeepLink = findViewById(R.id.textDeepLink);
        Button buttonRefresh = findViewById(R.id.buttonRefresh);
        Button buttonViewClaims = findViewById(R.id.buttonViewClaims);
        Button buttonShareLink = findViewById(R.id.buttonShareLink);
        Button buttonLogout = findViewById(R.id.buttonLogout);

        viewModel.getSellerName().observe(this, name ->
                textSellerName.setText("Welcome, " + name));
        viewModel.getSellerEmail().observe(this, textSellerEmail::setText);
        viewModel.getStatsText().observe(this, textStats::setText);
        viewModel.getDeepLink().observe(this, link -> {
            textDeepLink.setText("Buyer link: " + link);
        });
        viewModel.getError().observe(this, err -> {
            if (err != null && !err.isEmpty()) {
                Toast.makeText(this, err, Toast.LENGTH_LONG).show();
                // If not authenticated, go back to login
                startActivity(new Intent(this, LoginActivity.class));
                finish();
            }
        });

        buttonRefresh.setOnClickListener(v -> viewModel.loadDashboard());

        buttonViewClaims.setOnClickListener(v ->
                startActivity(new Intent(this, SellerClaimsActivity.class)));

        buttonShareLink.setOnClickListener(v -> {
            String link = viewModel.getDeepLink().getValue();
            if (link != null && !link.isEmpty()) {
                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType("text/plain");
                shareIntent.putExtra(Intent.EXTRA_TEXT,
                        "Use this link to document your package: " + link);
                startActivity(Intent.createChooser(shareIntent, "Share PackageGuard link"));
            } else {
                Toast.makeText(this, "Link not available yet", Toast.LENGTH_SHORT).show();
            }
        });

        buttonLogout.setOnClickListener(v -> {
            viewModel.getSessionManager().logout();
            Intent intent = new Intent(this, LoginActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            finish();
        });

        viewModel.loadDashboard();
    }
}
