/**
 * ViewModel that backs the seller claim detail screen.
 * Fetches claim details, exposes them to the UI, and performs approve/reject actions.
 */
package io.packageguard.app.presentation.seller;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import javax.inject.Inject;

import dagger.hilt.android.lifecycle.HiltViewModel;
import io.packageguard.app.data.local.preferences.SessionManager;
import io.packageguard.app.data.remote.api.PackageGuardApi;
import io.packageguard.app.data.remote.dto.ClaimDetailResponse;
import io.packageguard.app.data.remote.dto.SellerReviewRequest;
import io.packageguard.app.data.remote.dto.SellerReviewResponse;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

@HiltViewModel
public class SellerClaimDetailViewModel extends ViewModel {

    private final PackageGuardApi api;
    private final SessionManager sessionManager;

    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<String> error = new MutableLiveData<>();
    private final MutableLiveData<ClaimDetailResponse> detail = new MutableLiveData<>();
    private final MutableLiveData<Boolean> reviewLoading = new MutableLiveData<>(false);
    private final MutableLiveData<SellerReviewResponse> reviewResult = new MutableLiveData<>();
    private final MutableLiveData<String> reviewError = new MutableLiveData<>();

    @Inject
    public SellerClaimDetailViewModel(PackageGuardApi api, SessionManager sessionManager) {
        this.api = api;
        this.sessionManager = sessionManager;
    }

    public LiveData<Boolean> getLoading() { return loading; }
    public LiveData<String> getError() { return error; }
    public LiveData<ClaimDetailResponse> getDetail() { return detail; }
    public LiveData<Boolean> getReviewLoading() { return reviewLoading; }
    public LiveData<SellerReviewResponse> getReviewResult() { return reviewResult; }
    public LiveData<String> getReviewError() { return reviewError; }

    public String getBearerToken() { return sessionManager.getBearerToken(); }

    public void loadDetail(String claimId) {
        String bearer = sessionManager.getBearerToken();
        if (bearer == null) {
            error.setValue("Not authenticated");
            return;
        }
        loading.setValue(true);
        api.getClaimDetail(bearer, claimId).enqueue(new Callback<ClaimDetailResponse>() {
            @Override
            public void onResponse(Call<ClaimDetailResponse> call,
                                   Response<ClaimDetailResponse> response) {
                loading.setValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    detail.setValue(response.body());
                } else {
                    error.setValue("Failed to load claim: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<ClaimDetailResponse> call, Throwable t) {
                loading.setValue(false);
                error.setValue("Network error: " + t.getMessage());
            }
        });
    }

    public void submitReview(String claimId, String decision, String note) {
        String bearer = sessionManager.getBearerToken();
        if (bearer == null) {
            reviewError.setValue("Not authenticated");
            return;
        }
        reviewLoading.setValue(true);
        SellerReviewRequest req = new SellerReviewRequest(decision, note);
        api.reviewClaim(bearer, claimId, req).enqueue(new Callback<SellerReviewResponse>() {
            @Override
            public void onResponse(Call<SellerReviewResponse> call,
                                   Response<SellerReviewResponse> response) {
                reviewLoading.setValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    reviewResult.setValue(response.body());
                } else {
                    reviewError.setValue("Failed to save review: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<SellerReviewResponse> call, Throwable t) {
                reviewLoading.setValue(false);
                reviewError.setValue("Network error: " + t.getMessage());
            }
        });
    }
}
