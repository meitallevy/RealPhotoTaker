/**
 * SplashActivity
 *
 * App entry point shown briefly at launch. Checks whether the seller already has a saved
 * session and routes immediately to the correct screen without displaying any interactive UI.
 *
 * Key logic:
 *   onCreate() – SessionManager.isLoggedIn() == true  → SellerDashboardActivity
 *                otherwise                            → RoleSelectionActivity (Buyer or Seller)
 *                Calls finish() so the back button cannot return to this screen.
 */
package io.packageguard.app.presentation.splash;

import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import javax.inject.Inject;

import dagger.hilt.android.AndroidEntryPoint;
import io.packageguard.app.R;
import io.packageguard.app.data.local.preferences.SessionManager;
import io.packageguard.app.presentation.role.RoleSelectionActivity;
import io.packageguard.app.presentation.seller.SellerDashboardActivity;

@AndroidEntryPoint
public class SplashActivity extends AppCompatActivity {

    @Inject
    SessionManager sessionManager;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        // Route based on existing session
        if (sessionManager.isLoggedIn()) {
            startActivity(new Intent(this, SellerDashboardActivity.class));
        } else {
            startActivity(new Intent(this, RoleSelectionActivity.class));
        }
        finish();
    }
}
