package io.packageguard.app.presentation.seller;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import javax.inject.Inject;

import dagger.hilt.android.lifecycle.HiltViewModel;
import io.packageguard.app.data.local.preferences.SessionManager;
import io.packageguard.app.data.remote.api.PackageGuardApi;
import io.packageguard.app.data.remote.dto.SellerDashboardResponse;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

@HiltViewModel
public class SellerDashboardViewModel extends ViewModel {

    private final PackageGuardApi api;
    private final SessionManager sessionManager;

    private final MutableLiveData<String> sellerName = new MutableLiveData<>("-");
    private final MutableLiveData<String> sellerEmail = new MutableLiveData<>("");
    private final MutableLiveData<String> statsText = new MutableLiveData<>("Loading...");
    private final MutableLiveData<String> deepLink = new MutableLiveData<>("");
    private final MutableLiveData<String> error = new MutableLiveData<>();

    @Inject
    public SellerDashboardViewModel(PackageGuardApi api, SessionManager sessionManager) {
        this.api = api;
        this.sessionManager = sessionManager;
    }

    public LiveData<String> getSellerName() { return sellerName; }

    public LiveData<String> getSellerEmail() { return sellerEmail; }

    public LiveData<String> getStatsText() { return statsText; }

    public LiveData<String> getDeepLink() { return deepLink; }

    public LiveData<String> getError() { return error; }

    public SessionManager getSessionManager() { return sessionManager; }

    public void loadDashboard() {
        String bearer = sessionManager.getBearerToken();
        if (bearer == null) {
            error.setValue("Not authenticated");
            return;
        }
        statsText.setValue("Loading...");
        api.getSellerDashboard(bearer).enqueue(new Callback<SellerDashboardResponse>() {
            @Override
            public void onResponse(Call<SellerDashboardResponse> call,
                                   Response<SellerDashboardResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    SellerDashboardResponse body = response.body();
                    if (body.seller != null) {
                        sellerName.setValue(body.seller.businessName != null
                                ? body.seller.businessName : "-");
                        sellerEmail.setValue(body.seller.email != null
                                ? body.seller.email : "");
                    }
                    if (body.stats != null) {
                        statsText.setValue(
                                "Total claims: " + body.stats.totalClaims
                                + "\nThis month: " + body.stats.claimsThisMonth
                                + "\nAvg risk score: " + body.stats.averageRiskScore
                                + "\nHigh-risk claims: " + body.stats.highRiskClaims
                        );
                    }
                    if (body.qrCode != null && body.qrCode.deepLink != null) {
                        deepLink.setValue(body.qrCode.deepLink);
                    }
                } else {
                    statsText.setValue("Failed: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<SellerDashboardResponse> call, Throwable t) {
                statsText.setValue("Error: " + t.getMessage());
            }
        });
    }
}
