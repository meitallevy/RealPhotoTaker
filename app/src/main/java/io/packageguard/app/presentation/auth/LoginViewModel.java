/**
 * ViewModel for the seller login screen.
 * Wraps the auth API call, exposes simple LiveData for status messages and login success.
 */
package io.packageguard.app.presentation.auth;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import javax.inject.Inject;

import dagger.hilt.android.lifecycle.HiltViewModel;
import io.packageguard.app.data.local.preferences.SessionManager;
import io.packageguard.app.data.remote.api.PackageGuardApi;
import io.packageguard.app.data.remote.dto.AuthLoginRequest;
import io.packageguard.app.data.remote.dto.AuthLoginResponse;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

@HiltViewModel
public class LoginViewModel extends ViewModel {

    private final PackageGuardApi api;
    private final SessionManager sessionManager;

    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<String> statusMessage = new MutableLiveData<>("");
    private final MutableLiveData<AuthLoginResponse> loginSuccess = new MutableLiveData<>();

    @Inject
    public LoginViewModel(PackageGuardApi api, SessionManager sessionManager) {
        this.api = api;
        this.sessionManager = sessionManager;
    }

    public LiveData<Boolean> getLoading() { return loading; }

    public LiveData<String> getStatusMessage() { return statusMessage; }

    public LiveData<AuthLoginResponse> getLoginSuccess() { return loginSuccess; }

    public void login(String email, String password) {
        loading.setValue(true);
        statusMessage.setValue("Logging in...");

        AuthLoginRequest body = new AuthLoginRequest();
        body.email = email;
        body.password = password;
        body.deviceId = "android-device";
        body.attestationToken = null;

        api.login(body).enqueue(new Callback<AuthLoginResponse>() {
            @Override
            public void onResponse(Call<AuthLoginResponse> call, Response<AuthLoginResponse> response) {
                loading.setValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    AuthLoginResponse resp = response.body();
                    // Persist session securely
                    sessionManager.saveSession(
                            resp.accessToken,
                            resp.refreshToken,
                            resp.user != null ? resp.user.userId : null,
                            resp.user != null ? resp.user.sellerId : null
                    );
                    loginSuccess.setValue(resp);
                    statusMessage.setValue("Login successful");
                } else {
                    statusMessage.setValue("Login failed: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<AuthLoginResponse> call, Throwable t) {
                loading.setValue(false);
                statusMessage.setValue("Connection error: " + t.getMessage());
            }
        });
    }
}
