/**
 * DTO representing a single step in the guided capture flow (e.g. \"front of box\", \"label\").
 */
package io.packageguard.app.data.remote.dto;

public class CaptureStepDto {
    public String stepId;
    public int order;
    public String instruction;
    public boolean required;
    public String overlayGuideUrl;
}

