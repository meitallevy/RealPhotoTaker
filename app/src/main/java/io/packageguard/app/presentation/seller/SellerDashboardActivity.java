/**
 * Main home screen for logged-in sellers.
 * Shows high-level stats, navigation into claims lists, and links to other seller tools.
 */
package io.packageguard.app.presentation.seller;

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

        TextView textSellerName    = findViewById(R.id.textSellerName);
        TextView textSellerEmail   = findViewById(R.id.textSellerEmail);
        TextView textStats         = findViewById(R.id.textStats);
        TextView textSellerIdValue = findViewById(R.id.textSellerIdValue);
        Button buttonCopySellerId  = findViewById(R.id.buttonCopySellerId);
        Button buttonRefresh       = findViewById(R.id.buttonRefresh);
        Button buttonViewClaims    = findViewById(R.id.buttonViewClaims);
        Button buttonLogout        = findViewById(R.id.buttonLogout);

        viewModel.getSellerName().observe(this, name ->
                textSellerName.setText("Welcome, " + name));
        viewModel.getSellerEmail().observe(this, textSellerEmail::setText);
        viewModel.getStatsText().observe(this, textStats::setText);
        viewModel.getSellerId().observe(this, id -> {
            if (id != null && !id.isEmpty()) {
                textSellerIdValue.setText(id);
            }
        });
        viewModel.getError().observe(this, err -> {
            if (err != null && !err.isEmpty()) {
                Toast.makeText(this, err, Toast.LENGTH_LONG).show();
                startActivity(new Intent(this, LoginActivity.class));
                finish();
            }
        });

        buttonCopySellerId.setOnClickListener(v -> {
            String id = viewModel.getSellerId().getValue();
            if (id != null && !id.isEmpty()) {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                clipboard.setPrimaryClip(ClipData.newPlainText("Seller ID", id));
                Toast.makeText(this, "Seller ID copied!", Toast.LENGTH_SHORT).show();
            }
        });

        buttonRefresh.setOnClickListener(v -> viewModel.loadDashboard());

        buttonViewClaims.setOnClickListener(v ->
                startActivity(new Intent(this, SellerClaimsActivity.class)));

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
