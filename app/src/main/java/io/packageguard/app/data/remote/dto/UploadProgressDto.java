/**
 * DTO used to report upload progress for long-running evidence uploads.
 * Helps the UI display approximate completion percentage to the user.
 */
package io.packageguard.app.data.remote.dto;

public class UploadProgressDto {
    public int totalFiles;
    public int uploadedFiles;
    public int pendingFiles;
}
