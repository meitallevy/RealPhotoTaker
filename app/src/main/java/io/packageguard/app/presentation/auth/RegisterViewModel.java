/**
 * ViewModel backing the seller registration screen.
 * Performs the network call to create a new seller account and reports success or error text.
 */
package io.packageguard.app.presentation.auth;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import javax.inject.Inject;

import dagger.hilt.android.lifecycle.HiltViewModel;
import io.packageguard.app.data.remote.api.PackageGuardApi;
import io.packageguard.app.data.remote.dto.AuthRegisterRequest;
import io.packageguard.app.data.remote.dto.AuthRegisterResponse;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

@HiltViewModel
public class RegisterViewModel extends ViewModel {

    private final PackageGuardApi api;

    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<String> status = new MutableLiveData<>("");
    private final MutableLiveData<AuthRegisterResponse> success = new MutableLiveData<>();

    @Inject
    public RegisterViewModel(PackageGuardApi api) {
        this.api = api;
    }

    public LiveData<Boolean> getLoading() {
        return loading;
    }

    public LiveData<String> getStatus() {
        return status;
    }

    public LiveData<AuthRegisterResponse> getSuccess() {
        return success;
    }

    public void register(String email, String password, String businessName, String country) {
        loading.setValue(true);
        status.setValue("Registering...");

        AuthRegisterRequest body = new AuthRegisterRequest();
        body.email = email;
        body.password = password;
        body.businessName = businessName;
        body.country = country;

        api.register(body).enqueue(new Callback<AuthRegisterResponse>() {
            @Override
            public void onResponse(Call<AuthRegisterResponse> call, Response<AuthRegisterResponse> response) {
                loading.setValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    success.setValue(response.body());
                    status.setValue("Registered. Please log in.");
                } else {
                    status.setValue("Registration failed: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<AuthRegisterResponse> call, Throwable t) {
                loading.setValue(false);
                status.setValue("Registration error: " + t.getMessage());
            }
        });
    }
}

