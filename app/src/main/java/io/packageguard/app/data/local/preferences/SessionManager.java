/**
 * SessionManager
 *
 * Secure, encrypted local storage for the seller's login session.
 * Uses Android's EncryptedSharedPreferences (AES-256) so tokens are never stored in plaintext.
 * Injected as a Hilt singleton — every screen that needs auth calls this class.
 *
 * Key methods:
 *   saveSession()     – stores access token, refresh token, userId, and sellerId after login
 *   getAccessToken()  – raw JWT access token
 *   getBearerToken()  – ready-to-use "Bearer {token}" string for API Authorization headers
 *   getSellerId()     – public seller_id string (e.g. "sel_abc123") shown to buyers
 *   isLoggedIn()      – true if an access token is present (used by SplashActivity routing)
 *   logout()          – clears all stored credentials
 */
/**
 * Thin wrapper around SharedPreferences that stores the logged-in seller session.
 * Provides helpers to check login state and read/write auth-related values.
 */
package io.packageguard.app.data.local.preferences;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import java.io.IOException;
import java.security.GeneralSecurityException;

import javax.inject.Inject;
import javax.inject.Singleton;

import dagger.hilt.android.qualifiers.ApplicationContext;

@Singleton
public class SessionManager {

    private static final String PREF_FILE = "packageguard_session";
    private static final String KEY_ACCESS_TOKEN = "access_token";
    private static final String KEY_REFRESH_TOKEN = "refresh_token";
    private static final String KEY_SELLER_ID = "seller_id";
    private static final String KEY_USER_ID = "user_id";

    private final SharedPreferences prefs;

    @Inject
    public SessionManager(@ApplicationContext Context context) {
        SharedPreferences sp;
        try {
            MasterKey masterKey = new MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();
            sp = EncryptedSharedPreferences.create(
                    context,
                    PREF_FILE,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (GeneralSecurityException | IOException e) {
            sp = context.getSharedPreferences(PREF_FILE, Context.MODE_PRIVATE);
        }
        this.prefs = sp;
    }

    public void saveSession(String accessToken, String refreshToken, String userId, String sellerId) {
        prefs.edit()
                .putString(KEY_ACCESS_TOKEN, accessToken)
                .putString(KEY_REFRESH_TOKEN, refreshToken)
                .putString(KEY_USER_ID, userId)
                .putString(KEY_SELLER_ID, sellerId)
                .apply();
    }

    public String getAccessToken() {
        return prefs.getString(KEY_ACCESS_TOKEN, null);
    }

    public String getRefreshToken() {
        return prefs.getString(KEY_REFRESH_TOKEN, null);
    }

    public String getSellerId() {
        return prefs.getString(KEY_SELLER_ID, null);
    }

    public String getUserId() {
        return prefs.getString(KEY_USER_ID, null);
    }

    public boolean isLoggedIn() {
        String token = getAccessToken();
        return token != null && !token.isEmpty();
    }

    public String getBearerToken() {
        String token = getAccessToken();
        return token != null ? "Bearer " + token : null;
    }

    public void logout() {
        prefs.edit().clear().apply();
    }
}
