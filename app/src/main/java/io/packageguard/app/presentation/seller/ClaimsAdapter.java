package io.packageguard.app.presentation.seller;

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

    private final List<ClaimItemDto> claims = new ArrayList<>();
    private final OnItemClickListener listener;

    public ClaimsAdapter(OnItemClickListener listener) {
        this.listener = listener;
    }

    public void setClaims(List<ClaimItemDto> newClaims) {
        claims.clear();
        if (newClaims != null) claims.addAll(newClaims);
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
        ClaimItemDto item = claims.get(position);
        holder.textClaimId.setText(item.claimId);
        holder.textOrderId.setText("Order: " + item.orderId);
        holder.textStatus.setText(item.status);
        holder.textRisk.setText("Risk: " + item.riskScore);
        holder.textEvidenceCount.setText(item.evidenceCount + " photos");
        holder.itemView.setOnClickListener(v -> listener.onItemClick(item));
    }

    @Override
    public int getItemCount() {
        return claims.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textClaimId;
        TextView textOrderId;
        TextView textStatus;
        TextView textRisk;
        TextView textEvidenceCount;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            textClaimId = itemView.findViewById(R.id.textItemClaimId);
            textOrderId = itemView.findViewById(R.id.textItemOrderId);
            textStatus = itemView.findViewById(R.id.textItemStatus);
            textRisk = itemView.findViewById(R.id.textItemRisk);
            textEvidenceCount = itemView.findViewById(R.id.textItemEvidenceCount);
        }
    }
}
