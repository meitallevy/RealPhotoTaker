/**
 * ViewModel for BuyerClaimStatusActivity.
 * Fetches the current status of a claim from the backend API.
 */
package io.packageguard.app.presentation.claim;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import javax.inject.Inject;

import dagger.hilt.android.lifecycle.HiltViewModel;
import io.packageguard.app.data.remote.api.PackageGuardApi;
import io.packageguard.app.data.remote.dto.ClaimStatusResponse;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

@HiltViewModel
public class BuyerClaimStatusViewModel extends ViewModel {

    private final PackageGuardApi api;

    private final MutableLiveData<ClaimStatusResponse> claimStatus = new MutableLiveData<>();
    private final MutableLiveData<String> error = new MutableLiveData<>();
    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);

    @Inject
    public BuyerClaimStatusViewModel(PackageGuardApi api) {
        this.api = api;
    }

    public LiveData<ClaimStatusResponse> getClaimStatus() { return claimStatus; }
    public LiveData<String> getError() { return error; }
    public LiveData<Boolean> getLoading() { return loading; }

    public void loadStatus(String claimId) {
        if (claimId == null || claimId.isEmpty()) {
            error.setValue("Invalid claim ID");
            return;
        }

        loading.setValue(true);
        error.setValue(null);

        api.getClaimStatus(claimId).enqueue(new Callback<ClaimStatusResponse>() {
            @Override
            public void onResponse(Call<ClaimStatusResponse> call, Response<ClaimStatusResponse> response) {
                loading.setValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    claimStatus.setValue(response.body());
                } else {
                    error.setValue("Failed to load status: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<ClaimStatusResponse> call, Throwable t) {
                loading.setValue(false);
                error.setValue("Network error: " + t.getMessage());
            }
        });
    }
}
