import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * The source path of the image, relative to the public directory
   */
  src: string;
  /**
   * Alt text for the image (required for accessibility)
   */
  alt: string;
  /**
   * Width of the image
   */
  width?: number;
  /**
   * Height of the image
   */
  height?: number;
  /**
   * Quality of the optimized image (1-100)
   */
  quality?: number;
  /**
   * Output format of the image
   */
  format?: "webp" | "jpg" | "png";
  /**
   * Whether to show a placeholder while the image loads
   */
  withPlaceholder?: boolean;
  /**
   * Type of placeholder to use
   */
  placeholderFormat?: "base64" | "svg" | "css";
  /**
   * Size of the placeholder (4-64)
   */
  placeholderSize?: number;
  /**
   * Class name for the wrapper div
   */
  wrapperClassName?: string;
  children?: React.ReactNode;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 75,
  format = "webp",
  withPlaceholder = true,
  placeholderFormat = "base64",
  placeholderSize = 4,
  wrapperClassName,
  className,
  children,
  ...props
}: ImageProps) {
  const [placeholder, setPlaceholder] = useState<
    string | Record<string, string> | null
  >(null);

  // Build the optimized image URL
  const imageUrl = `/api/image${src}${
    src.includes("?") ? "&" : "?"
  }w=${width || ""}&h=${height || ""}&q=${quality}&f=${format}`;

  // Fetch the placeholder
  useEffect(() => {
    if (!withPlaceholder) return;

    const fetchPlaceholder = async () => {
      try {
        const res = await fetch(
          `/api/placeholder${src}?f=${placeholderFormat}&s=${placeholderSize}`
        );
        const data = await res.json();

        if (data.placeholder) {
          if (placeholderFormat === "base64") {
            setPlaceholder(data.placeholder);
          } else if (placeholderFormat === "css") {
            setPlaceholder(data.placeholder);
          }
        }
      } catch (error) {
        console.error("Failed to load placeholder:", error);
      }
    };

    fetchPlaceholder();
  }, [src, placeholderFormat, placeholderSize, withPlaceholder]);

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        { "bg-muted": !placeholder },
        "w-full h-auto",
        wrapperClassName
      )}
    >
      {/* biome-ignore lint/a11y/useAltText: We are passing the alt */}
      <img
        src={imageUrl}
        alt={alt}
        width={width}
        height={height}
        className={cn("size-full object-cover z-10 absolute inset-0", className)}
        {...props}
      />
      {withPlaceholder && placeholder && (
        <div
          className="absolute inset-0 size-full z-0"
          style={
            placeholderFormat === "css" && typeof placeholder === "object"
              ? placeholder
              : {
                  backgroundImage: `url(${placeholder})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                }
          }
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}
