package io.packageguard.app.presentation.role;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import dagger.hilt.android.AndroidEntryPoint;
import io.packageguard.app.R;
import io.packageguard.app.presentation.auth.LoginActivity;
import io.packageguard.app.presentation.auth.RegisterActivity;
import io.packageguard.app.presentation.claim.ClaimEntryActivity;

@AndroidEntryPoint
public class RoleSelectionActivity extends AppCompatActivity {

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_role_selection);

        Button buttonSeller = findViewById(R.id.buttonSeller);
        Button buttonClient = findViewById(R.id.buttonClient);
        Button buttonRegister = findViewById(R.id.buttonRegisterSeller);

        // Sellers log in to access their dashboard
        buttonSeller.setOnClickListener(v ->
                startActivity(new Intent(this, LoginActivity.class)));

        // Buyers/clients file a claim (no login required)
        buttonClient.setOnClickListener(v ->
                startActivity(new Intent(this, ClaimEntryActivity.class)));

        // New sellers register an account
        buttonRegister.setOnClickListener(v ->
                startActivity(new Intent(this, RegisterActivity.class)));
    }
}
