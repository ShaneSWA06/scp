import React, { useState } from "react";
import "./sanitizeImage.css";

const SanitizedImage = ({
  src,
  alt,
  aspectRatio = "4-3", // '16-9', '4-3', 'square', '3-2'
  className = "",
  interactive = false,
  fallbackIcon = "🖼️",
  onError = null,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = (e) => {
    setImageError(true);
    setImageLoading(false);
    if (onError) onError(e);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  return (
    <div
      className={`
      image-container 
      image-container--${aspectRatio} 
      ${interactive ? "image-container--interactive" : ""}
      ${className}
    `}
    >
      {imageLoading && !imageError && (
        <div className="image-loading-placeholder" />
      )}

      {imageError ? (
        <div className="image-error-placeholder">{fallbackIcon}</div>
      ) : (
        <img
          src={src}
          alt={alt}
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{ display: imageLoading ? "none" : "block" }}
        />
      )}
    </div>
  );
};

export default SanitizedImage;
