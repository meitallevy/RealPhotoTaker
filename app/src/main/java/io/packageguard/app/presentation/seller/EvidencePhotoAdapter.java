/**
 * RecyclerView adapter used on the seller side to preview all evidence photos in a claim.
 * Presents thumbnail images and basic metadata in a scrollable list or gallery.
 */
package io.packageguard.app.presentation.seller;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.model.GlideUrl;
import com.bumptech.glide.load.model.LazyHeaders;

import java.util.ArrayList;
import java.util.List;

import io.packageguard.app.R;
import io.packageguard.app.data.remote.dto.EvidenceItemDto;

public class EvidencePhotoAdapter extends RecyclerView.Adapter<EvidencePhotoAdapter.ViewHolder> {

    public interface OnPhotoClickListener {
        void onPhotoClick(String imageUrl, String bearer);
    }

    private final List<EvidenceItemDto> photos = new ArrayList<>();
    private String bearer;
    private final OnPhotoClickListener listener;

    public EvidencePhotoAdapter(OnPhotoClickListener listener) {
        this.listener = listener;
    }

    public void setPhotos(List<EvidenceItemDto> newPhotos, String bearerToken) {
        this.bearer = bearerToken;
        photos.clear();
        if (newPhotos != null) photos.addAll(newPhotos);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_evidence_photo, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        EvidenceItemDto item = photos.get(position);

        int photoNum = position + 1;
        String label = "Photo " + photoNum;
        if (item.stepId != null && !item.stepId.isEmpty()) {
            label = item.stepId;
        }
        holder.textLabel.setText(label);

        if (item.imageUrl != null && !item.imageUrl.isEmpty() && bearer != null) {
            GlideUrl url = new GlideUrl(item.imageUrl,
                    new LazyHeaders.Builder()
                            .addHeader("Authorization", bearer)
                            .build());
            Glide.with(holder.itemView.getContext())
                    .load(url)
                    .centerCrop()
                    .placeholder(android.R.color.darker_gray)
                    .error(android.R.color.holo_red_light)
                    .into(holder.imageView);
        } else {
            holder.imageView.setImageResource(android.R.color.darker_gray);
        }

        holder.itemView.setOnClickListener(v -> {
            if (item.imageUrl != null && listener != null) {
                listener.onPhotoClick(item.imageUrl, bearer);
            }
        });
    }

    @Override
    public int getItemCount() { return photos.size(); }

    static class ViewHolder extends RecyclerView.ViewHolder {
        ImageView imageView;
        TextView textLabel;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            imageView = itemView.findViewById(R.id.imageEvidence);
            textLabel = itemView.findViewById(R.id.textPhotoLabel);
        }
    }
}
