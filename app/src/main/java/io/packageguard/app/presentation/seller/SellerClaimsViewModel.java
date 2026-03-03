package io.packageguard.app.presentation.seller;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import javax.inject.Inject;

import dagger.hilt.android.lifecycle.HiltViewModel;
import io.packageguard.app.data.local.preferences.SessionManager;
import io.packageguard.app.data.remote.api.PackageGuardApi;
import io.packageguard.app.data.remote.dto.SellerClaimsListResponse;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

@HiltViewModel
public class SellerClaimsViewModel extends ViewModel {

    private final PackageGuardApi api;
    private final SessionManager sessionManager;

    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<String> statusMessage = new MutableLiveData<>("");
    private final MutableLiveData<SellerClaimsListResponse> claimsList = new MutableLiveData<>();

    @Inject
    public SellerClaimsViewModel(PackageGuardApi api, SessionManager sessionManager) {
        this.api = api;
        this.sessionManager = sessionManager;
    }

    public LiveData<Boolean> getLoading() { return loading; }

    public LiveData<String> getStatusMessage() { return statusMessage; }

    public LiveData<SellerClaimsListResponse> getClaimsList() { return claimsList; }

    public void loadClaims() {
        String bearer = sessionManager.getBearerToken();
        if (bearer == null) {
            statusMessage.setValue("Not authenticated");
            return;
        }

        loading.setValue(true);
        statusMessage.setValue("");

        api.getSellerClaims(bearer, 1, 50).enqueue(new Callback<SellerClaimsListResponse>() {
            @Override
            public void onResponse(Call<SellerClaimsListResponse> call,
                                   Response<SellerClaimsListResponse> response) {
                loading.setValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    claimsList.setValue(response.body());
                } else {
                    statusMessage.setValue("Failed to load claims: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<SellerClaimsListResponse> call, Throwable t) {
                loading.setValue(false);
                statusMessage.setValue("Error: " + t.getMessage());
            }
        });
    }
}
