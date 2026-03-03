package io.packageguard.app.data.remote.api;

import io.packageguard.app.data.remote.dto.AuthLoginRequest;
import io.packageguard.app.data.remote.dto.AuthLoginResponse;
import io.packageguard.app.data.remote.dto.AuthRegisterRequest;
import io.packageguard.app.data.remote.dto.AuthRegisterResponse;
import io.packageguard.app.data.remote.dto.ClaimCompleteRequest;
import io.packageguard.app.data.remote.dto.ClaimCompleteResponse;
import io.packageguard.app.data.remote.dto.ClaimInitiateRequest;
import io.packageguard.app.data.remote.dto.ClaimInitiateResponse;
import io.packageguard.app.data.remote.dto.ClaimStatusResponse;
import io.packageguard.app.data.remote.dto.ConfigAppResponse;
import io.packageguard.app.data.remote.dto.ConfigCaptureResponse;
import io.packageguard.app.data.remote.dto.EvidenceUploadResponse;
import io.packageguard.app.data.remote.dto.ClaimDetailResponse;
import io.packageguard.app.data.remote.dto.SellerClaimsListResponse;
import io.packageguard.app.data.remote.dto.SellerDashboardResponse;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.Multipart;
import retrofit2.http.POST;
import retrofit2.http.Part;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface PackageGuardApi {

    @POST("/v1/auth/register")
    Call<AuthRegisterResponse> register(@Body AuthRegisterRequest body);

    @POST("/v1/auth/login")
    Call<AuthLoginResponse> login(@Body AuthLoginRequest body);

    @GET("/v1/config/app")
    Call<ConfigAppResponse> getAppConfig(
            @Header("X-App-Version") String appVersion,
            @Header("X-Platform") String platform,
            @Header("X-Device-Id") String deviceId
    );

    @GET("/v1/config/capture")
    Call<ConfigCaptureResponse> getCaptureConfig(
            @Query("sellerId") String sellerId
    );

    // Claim flow — auth optional for buyers
    @POST("/v1/claims/initiate")
    Call<ClaimInitiateResponse> initiateClaim(
            @Header("Authorization") String bearer,
            @Body ClaimInitiateRequest body
    );

    @Multipart
    @POST("/v1/claims/{claimId}/evidence")
    Call<EvidenceUploadResponse> uploadEvidence(
            @Header("Authorization") String bearer,
            @Path("claimId") String claimId,
            @Part MultipartBody.Part file,
            @Part("metadata") RequestBody metadata
    );

    @POST("/v1/claims/{claimId}/complete")
    Call<ClaimCompleteResponse> completeClaim(
            @Header("Authorization") String bearer,
            @Path("claimId") String claimId,
            @Body ClaimCompleteRequest body
    );

    @GET("/v1/claims/{claimId}/status")
    Call<ClaimStatusResponse> getClaimStatus(
            @Path("claimId") String claimId
    );

    // Seller endpoints — require auth
    @GET("/v1/seller/dashboard")
    Call<SellerDashboardResponse> getSellerDashboard(
            @Header("Authorization") String bearer
    );

    @GET("/v1/seller/claims/{claimId}")
    Call<ClaimDetailResponse> getClaimDetail(
            @Header("Authorization") String bearer,
            @Path("claimId") String claimId
    );

    @GET("/v1/seller/claims")
    Call<SellerClaimsListResponse> getSellerClaims(
            @Header("Authorization") String bearer,
            @Query("page") int page,
            @Query("limit") int limit
    );
}
