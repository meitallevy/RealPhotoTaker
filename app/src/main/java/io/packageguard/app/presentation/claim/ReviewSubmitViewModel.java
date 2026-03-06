/**
 * ReviewSubmitViewModel
 *
 * Handles all network calls for the review-and-submit step.
 * Uploads photos one at a time (sequential, not parallel) to avoid overwhelming the server,
 * then calls completeClaim once all uploads finish.
 *
 * Key methods:
 *   uploadAndSubmit() – starts the sequential upload chain; call from the UI on Submit tap
 *   uploadNextFile()  – recursive helper that uploads file[index] then calls itself for index+1
 *   completeClaim()   – called after all files are uploaded; posts submitComplete LiveData on success
 *
 * LiveData:
 *   getLoading()        – true while uploading
 *   getStatusMessage()  – human-readable status string for display
 *   getUploadProgress() – "Uploading X / N" progress text
 *   getSubmitComplete() – ClaimCompleteResponse on success (triggers navigation to Confirmation)
 */
package io.packageguard.app.presentation.claim;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import javax.inject.Inject;

import dagger.hilt.android.lifecycle.HiltViewModel;
import io.packageguard.app.data.remote.api.PackageGuardApi;
import io.packageguard.app.data.remote.dto.ClaimCompleteRequest;
import io.packageguard.app.data.remote.dto.ClaimCompleteResponse;
import io.packageguard.app.data.remote.dto.EvidenceUploadResponse;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

@HiltViewModel
public class ReviewSubmitViewModel extends ViewModel {

    private final PackageGuardApi api;

    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<String> statusMessage = new MutableLiveData<>("");
    private final MutableLiveData<String> uploadProgress = new MutableLiveData<>("");
    private final MutableLiveData<ClaimCompleteResponse> submitComplete = new MutableLiveData<>();

    @Inject
    public ReviewSubmitViewModel(PackageGuardApi api) {
        this.api = api;
    }

    public LiveData<Boolean> getLoading() { return loading; }

    public LiveData<String> getStatusMessage() { return statusMessage; }

    public LiveData<String> getUploadProgress() { return uploadProgress; }

    public LiveData<ClaimCompleteResponse> getSubmitComplete() { return submitComplete; }

    public void uploadAndSubmit(String claimId, List<String> filePaths, String buyerNotes) {
        loading.setValue(true);
        statusMessage.setValue("Uploading evidence...");
        uploadNextFile(claimId, filePaths, 0, buyerNotes);
    }

    private void uploadNextFile(String claimId, List<String> filePaths, int index, String buyerNotes) {
        if (index >= filePaths.size()) {
            completeClaim(claimId, filePaths.size(), buyerNotes);
            return;
        }

        uploadProgress.setValue("Uploading " + (index + 1) + " / " + filePaths.size());

        File file = new File(filePaths.get(index));
        if (!file.exists()) {
            uploadNextFile(claimId, filePaths, index + 1, buyerNotes);
            return;
        }

        String capturedAt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(new Date());
        String metadataJson = "{\"sequenceNumber\":" + (index + 1) + ",\"capturedAt\":\"" + capturedAt + "\"}";

        RequestBody fileBody = RequestBody.create(file, MediaType.parse("image/jpeg"));
        MultipartBody.Part filePart = MultipartBody.Part.createFormData("file", file.getName(), fileBody);
        RequestBody metadataBody = RequestBody.create(metadataJson, MediaType.parse("text/plain"));

        api.uploadEvidence(null, claimId, filePart, metadataBody).enqueue(new Callback<EvidenceUploadResponse>() {
            @Override
            public void onResponse(Call<EvidenceUploadResponse> call, Response<EvidenceUploadResponse> response) {
                uploadNextFile(claimId, filePaths, index + 1, buyerNotes);
            }

            @Override
            public void onFailure(Call<EvidenceUploadResponse> call, Throwable t) {
                loading.setValue(false);
                statusMessage.setValue("Upload failed: " + t.getMessage());
            }
        });
    }

    private void completeClaim(String claimId, int totalCount, String buyerNotes) {
        uploadProgress.setValue("Finalizing...");

        ClaimCompleteRequest body = new ClaimCompleteRequest();
        body.totalEvidenceCount = totalCount;
        body.buyerNotes = buyerNotes;

        api.completeClaim(null, claimId, body).enqueue(new Callback<ClaimCompleteResponse>() {
            @Override
            public void onResponse(Call<ClaimCompleteResponse> call, Response<ClaimCompleteResponse> response) {
                loading.setValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    submitComplete.setValue(response.body());
                    statusMessage.setValue("Submitted successfully!");
                } else {
                    statusMessage.setValue("Failed to complete: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<ClaimCompleteResponse> call, Throwable t) {
                loading.setValue(false);
                statusMessage.setValue("Error: " + t.getMessage());
            }
        });
    }
}
