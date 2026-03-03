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
import io.packageguard.app.data.remote.dto.AuthLoginResponse;
import io.packageguard.app.presentation.seller.SellerDashboardActivity;

@AndroidEntryPoint
public class LoginActivity extends AppCompatActivity {

    private LoginViewModel viewModel;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_login);

        viewModel = new ViewModelProvider(this).get(LoginViewModel.class);

        EditText editEmail = findViewById(R.id.editEmail);
        EditText editPassword = findViewById(R.id.editPassword);
        Button buttonLogin = findViewById(R.id.buttonLogin);
        TextView textStatus = findViewById(R.id.textLoginStatus);

        buttonLogin.setOnClickListener(v -> {
            String email = editEmail.getText().toString().trim();
            String password = editPassword.getText().toString();
            if (TextUtils.isEmpty(email) || TextUtils.isEmpty(password)) {
                textStatus.setText("Enter email and password");
                return;
            }
            viewModel.login(email, password);
        });

        viewModel.getStatusMessage().observe(this, textStatus::setText);

        viewModel.getLoginSuccess().observe(this, (AuthLoginResponse resp) -> {
            // In a full implementation, persist tokens securely.
            android.content.Intent intent = new android.content.Intent(this, SellerDashboardActivity.class);
            startActivity(intent);
            finish();
        });
    }
}


