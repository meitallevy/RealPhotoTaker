/**
 * RecyclerView adapter that renders a list of claims for the seller.
 * Binds basic claim metadata into card views and routes clicks to claim detail screens.
 */
package io.packageguard.app.presentation.seller;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

import io.packageguard.app.R;
import io.packageguard.app.data.remote.dto.ClaimItemDto;

public class ClaimsAdapter extends RecyclerView.Adapter<ClaimsAdapter.ViewHolder> {

    public interface OnItemClickListener {
        void onItemClick(ClaimItemDto item);
    }

    private final List<ClaimItemDto> allClaims = new ArrayList<>();
    private final List<ClaimItemDto> visibleClaims = new ArrayList<>();
    private final OnItemClickListener listener;

    public ClaimsAdapter(OnItemClickListener listener) {
        this.listener = listener;
    }

    public void setAllClaims(List<ClaimItemDto> newClaims) {
        allClaims.clear();
        if (newClaims != null) {
            allClaims.addAll(newClaims);
        }
        // Preserve current filter (default to open)
        if (showingResolved) {
            showResolved();
        } else {
            showOpen();
        }
    }

    private boolean showingResolved = false;

    public void showOpen() {
        showingResolved = false;
        visibleClaims.clear();
        for (ClaimItemDto item : allClaims) {
            // Open = not fully resolved: no decision yet OR MORE_INFO_REQUESTED
            if (item.sellerDecision == null || item.sellerDecision.isEmpty()
                    || "MORE_INFO_REQUESTED".equalsIgnoreCase(item.sellerDecision)) {
                visibleClaims.add(item);
            }
        }
        notifyDataSetChanged();
    }

    public void showResolved() {
        showingResolved = true;
        visibleClaims.clear();
        for (ClaimItemDto item : allClaims) {
            if ("APPROVED".equalsIgnoreCase(item.sellerDecision)
                    || "REJECTED".equalsIgnoreCase(item.sellerDecision)) {
                visibleClaims.add(item);
            }
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_claim, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        ClaimItemDto item = visibleClaims.get(position);
        holder.textClaimId.setText(item.claimId);
        holder.textOrderId.setText("Order: " + item.orderId);
        holder.textEvidenceCount.setText(item.evidenceCount + " photo" + (item.evidenceCount != 1 ? "s" : ""));

        // Status chip
        applyStatusChip(holder.textStatus, item.status);

        // Decision badge
        if (item.sellerDecision != null && !item.sellerDecision.isEmpty()) {
            holder.textDecision.setVisibility(View.VISIBLE);
            applyDecisionChip(holder.textDecision, item.sellerDecision);
        } else {
            holder.textDecision.setVisibility(View.GONE);
        }

        holder.itemView.setOnClickListener(v -> listener.onItemClick(item));
    }

    @Override
    public int getItemCount() {
        return visibleClaims.size();
    }

    private static void applyStatusChip(TextView tv, String status) {
        String label;
        int bg, fg;
        switch (status == null ? "" : status.toUpperCase()) {
            case "COMPLETED":
                label = "Resolved";
                bg = Color.parseColor("#E8F5E9"); fg = Color.parseColor("#1B5E20"); break;
            case "PROCESSING":
            case "UPLOADING":
                label = "Processing";
                bg = Color.parseColor("#E3F2FD"); fg = Color.parseColor("#1565C0"); break;
            case "FAILED":
            case "EXPIRED":
                label = "Failed";
                bg = Color.parseColor("#FFEBEE"); fg = Color.parseColor("#B71C1C"); break;
            default:
                label = "Waiting for reviewer";
                bg = Color.parseColor("#FFF3E0"); fg = Color.parseColor("#E65100"); break;
        }
        tv.setText(label);
        applyRoundedBg(tv, bg, fg);
    }

    private static void applyDecisionChip(TextView tv, String decision) {
        int bg, fg;
        switch (decision.toUpperCase()) {
            case "APPROVED":
                tv.setText("Approved \u2713");
                bg = Color.parseColor("#E8F5E9"); fg = Color.parseColor("#1B5E20"); break;
            case "REJECTED":
                tv.setText("Rejected \u2717");
                bg = Color.parseColor("#FFEBEE"); fg = Color.parseColor("#B71C1C"); break;
            default:
                tv.setText("More Info Requested");
                bg = Color.parseColor("#FFF3E0"); fg = Color.parseColor("#E65100"); break;
        }
        applyRoundedBg(tv, bg, fg);
    }

    private static void applyRoundedBg(TextView tv, int bgColor, int textColor) {
        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.RECTANGLE);
        bg.setCornerRadius(999f);
        bg.setColor(bgColor);
        tv.setBackground(bg);
        tv.setTextColor(textColor);
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textClaimId;
        TextView textOrderId;
        TextView textStatus;
        TextView textEvidenceCount;
        TextView textDecision;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            textClaimId      = itemView.findViewById(R.id.textItemClaimId);
            textOrderId      = itemView.findViewById(R.id.textItemOrderId);
            textStatus       = itemView.findViewById(R.id.textItemStatus);
            textEvidenceCount = itemView.findViewById(R.id.textItemEvidenceCount);
            textDecision     = itemView.findViewById(R.id.textItemDecision);
        }
    }
}
