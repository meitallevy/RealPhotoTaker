/**
 * DTO describing validation rules that the app should apply while capturing photos.
 * For example, minimum number of photos or required angles.
 */
package io.packageguard.app.data.remote.dto;

import java.util.List;

public class CaptureValidationDto {
    public int minPhotos;
    public int maxPhotos;
    public int minResolution;
    public int maxFileSizeMb;
    public List<String> allowedFormats;
}

