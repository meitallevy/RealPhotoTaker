/**
 * Application entry point for the PackageGuard Android client.
 * Used only to bootstrap Hilt dependency injection across the app process.
 */
package io.packageguard.app;

import android.app.Application;

import dagger.hilt.android.HiltAndroidApp;

@HiltAndroidApp
public class PackageGuardApp extends Application {
}

