import { createImageUpload } from "novel";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

const onUpload = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const promise = apiClient.post<any>("/media/upload", formData);

  return new Promise((resolve, reject) => {
    toast.promise(
      promise.then((res) => {
        // Successfully uploaded image
        if (res.success) {
          const { url } = res;
          // preload the image
          const image = new Image();
          image.src = url;
          image.onload = () => {
            resolve(url);
          };
        } else {
          throw new Error("Error uploading image. Please try again.");
        }
      }),
      {
        loading: "Uploading image...",
        success: "Image uploaded successfully.",
        error: (e) => {
          reject(e);
          return e.message;
        },
      },
    );
  });
};

export const uploadFn = createImageUpload({
  onUpload,
  validateFn: (file) => {
    if (!file.type.includes("image/")) {
      toast.error("File type not supported.");
      return false;
    }
    if (file.size / 1024 / 1024 > 20) {
      toast.error("File size too big (max 20MB).");
      return false;
    }
    return true;
  },
});
