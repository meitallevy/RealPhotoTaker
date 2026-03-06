/**
 * Simple registration screen for new sellers.
 * Collects basic details, delegates to RegisterViewModel, and finishes when sign-up succeeds.
 */
package io.packageguard.app.presentation.auth;

import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import dagger.hilt.android.AndroidEntryPoint;
import io.packageguard.app.R;

@AndroidEntryPoint
public class RegisterActivity extends AppCompatActivity {

    private RegisterViewModel viewModel;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        viewModel = new ViewModelProvider(this).get(RegisterViewModel.class);

        EditText editEmail = findViewById(R.id.editRegisterEmail);
        EditText editPassword = findViewById(R.id.editRegisterPassword);
        EditText editBusinessName = findViewById(R.id.editBusinessName);
        EditText editCountry = findViewById(R.id.editCountry);
        Button buttonRegister = findViewById(R.id.buttonRegister);
        TextView textStatus = findViewById(R.id.textRegisterStatus);

        buttonRegister.setOnClickListener(v -> {
            String email = editEmail.getText().toString().trim();
            String password = editPassword.getText().toString();
            String businessName = editBusinessName.getText().toString().trim();
            String country = editCountry.getText().toString().trim();

            if (TextUtils.isEmpty(email) || TextUtils.isEmpty(password)) {
                textStatus.setText("Email and password are required");
                return;
            }

            viewModel.register(email, password, businessName, country);
        });

        viewModel.getStatus().observe(this, textStatus::setText);
    }
}

