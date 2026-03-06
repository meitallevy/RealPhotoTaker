/**
 * NetworkModule
 *
 * Hilt dependency injection module that wires up the entire networking stack as singletons.
 * Provides one shared instance of Gson, OkHttpClient, Retrofit, and PackageGuardApi for the
 * whole app — no manual instantiation needed anywhere else.
 *
 * The API base URL comes from BuildConfig.API_BASE_URL, set in app/build.gradle.
 * To point at a different server (local dev, staging, production) change that value.
 *
 * Key providers:
 *   provideGson()            – Gson JSON parser
 *   provideOkHttpClient()    – HTTP client (add interceptors here for logging or auth)
 *   provideRetrofit()        – Retrofit instance bound to API_BASE_URL
 *   providePackageGuardApi() – generated Retrofit implementation of PackageGuardApi
 */
package io.packageguard.app.di;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import javax.inject.Singleton;

import dagger.Module;
import dagger.Provides;
import dagger.hilt.InstallIn;
import dagger.hilt.components.SingletonComponent;
import io.packageguard.app.BuildConfig;
import io.packageguard.app.data.remote.api.PackageGuardApi;
import okhttp3.OkHttpClient;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

@Module
@InstallIn(SingletonComponent.class)
public class NetworkModule {

    @Provides
    @Singleton
    public static Gson provideGson() {
        return new GsonBuilder().create();
    }

    @Provides
    @Singleton
    public static OkHttpClient provideOkHttpClient() {
        return new OkHttpClient.Builder().build();
    }

    @Provides
    @Singleton
    public static Retrofit provideRetrofit(OkHttpClient okHttpClient, Gson gson) {
        return new Retrofit.Builder()
                .baseUrl(BuildConfig.API_BASE_URL)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build();
    }

    @Provides
    @Singleton
    public static PackageGuardApi providePackageGuardApi(Retrofit retrofit) {
        return retrofit.create(PackageGuardApi.class);
    }
}

