package io.packageguard.app.data.remote.dto;

import java.util.List;

public class ConfigCaptureResponse {
    public String captureMode;
    public List<CaptureStepDto> steps;
    public NonceDisplayDto nonceDisplay;
    public CaptureValidationDto validation;
    public CaptureTimeoutDto timeout;
}

