/**
 * ViewModel behind the initial claim entry screen where buyers type seller + order info.
 * Kicks off claim initiation on the backend and exposes loading / error state to the UI.
 */
package io.packageguard.app.presentation.claim;

import android.content.Context;
import android.os.Build;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import javax.inject.Inject;

import dagger.hilt.android.lifecycle.HiltViewModel;
import dagger.hilt.android.qualifiers.ApplicationContext;
import io.packageguard.app.data.remote.api.PackageGuardApi;
import io.packageguard.app.data.remote.dto.ClaimInitiateRequest;
import io.packageguard.app.data.remote.dto.ClaimInitiateResponse;
import io.packageguard.app.data.remote.dto.DeviceInfoDto;
import io.packageguard.app.util.DeviceInfo;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

@HiltViewModel
public class ClaimEntryViewModel extends ViewModel {

    private final PackageGuardApi api;
    private final Context appContext;

    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<String> statusMessage = new MutableLiveData<>("");
    private final MutableLiveData<ClaimInitiateResponse> claimInitiated = new MutableLiveData<>();

    @Inject
    public ClaimEntryViewModel(PackageGuardApi api, @ApplicationContext Context context) {
        this.api = api;
        this.appContext = context;
    }

    public LiveData<Boolean> getLoading() { return loading; }

    public LiveData<String> getStatusMessage() { return statusMessage; }

    public LiveData<ClaimInitiateResponse> getClaimInitiated() { return claimInitiated; }

    public void startClaim(String sellerId, String orderId) {
        if (sellerId == null || sellerId.isEmpty()) {
            statusMessage.setValue("Seller ID is required");
            return;
        }
        if (orderId == null || orderId.isEmpty()) {
            statusMessage.setValue("Order ID is required");
            return;
        }

        loading.setValue(true);
        statusMessage.setValue("Starting claim...");

        DeviceInfoDto deviceInfo = new DeviceInfoDto();
        deviceInfo.platform = "android";
        deviceInfo.osVersion = Build.VERSION.RELEASE;
        deviceInfo.appVersion = "1.0.0";
        deviceInfo.deviceModel = DeviceInfo.getDeviceModel();
        deviceInfo.deviceId = DeviceInfo.getDeviceId(appContext);

        ClaimInitiateRequest body = new ClaimInitiateRequest();
        body.sellerId = sellerId;
        body.orderId = orderId;
        body.deviceInfo = deviceInfo;

        // No bearer token for buyer flow
        api.initiateClaim(null, body).enqueue(new Callback<ClaimInitiateResponse>() {
            @Override
            public void onResponse(Call<ClaimInitiateResponse> call, Response<ClaimInitiateResponse> response) {
                loading.setValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    claimInitiated.setValue(response.body());
                    statusMessage.setValue("Claim started");
                } else {
                    statusMessage.setValue("Failed: " + response.code() + " — check Seller ID");
                }
            }

            @Override
            public void onFailure(Call<ClaimInitiateResponse> call, Throwable t) {
                loading.setValue(false);
                statusMessage.setValue("Connection error: " + t.getMessage());
            }
        });
    }
}
