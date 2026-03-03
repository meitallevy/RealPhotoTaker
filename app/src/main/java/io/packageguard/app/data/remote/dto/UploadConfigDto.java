package io.packageguard.app.data.remote.dto;

public class UploadConfigDto {
    public long chunkSizeBytes;
    public int maxConcurrentUploads;
    public boolean resumable;
}

