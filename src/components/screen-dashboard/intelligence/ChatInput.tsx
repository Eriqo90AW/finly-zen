import { createSignal, Show } from "solid-js";

export interface ImagePayload {
  base64: string;
  fileName: string;
}

interface Props {
  onSend: (text: string, attachment?: ImagePayload) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_IMAGE_SIZE_MB = 10;

const ChatInput = (props: Props) => {
  const [input, setInput] = createSignal("");
  const [selectedImage, setSelectedImage] = createSignal<ImagePayload | null>(null);
  const [isDragging, setIsDragging] = createSignal(false);
  const [uploadError, setUploadError] = createSignal<string | null>(null);

  let fileInputRef: HTMLInputElement | undefined;

  const processFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file (JPG, PNG, WebP, HEIC).");
      return;
    }

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_IMAGE_SIZE_MB) {
      setUploadError(`Image is too large (${sizeMb.toFixed(1)}MB). Max limit is ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSelectedImage({
          base64: reader.result,
          fileName: file.name,
        });
      }
    };
    reader.onerror = () => {
      setUploadError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setUploadError(null);
    if (fileInputRef) fileInputRef.value = "";
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const text = input().trim();
    const image = selectedImage();
    if ((!text && !image) || props.disabled) return;

    props.onSend(text, image || undefined);
    setInput("");
    setSelectedImage(null);
    setUploadError(null);
    if (fileInputRef) fileInputRef.value = "";
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!props.disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (props.disabled) return;

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const canSubmit = () => Boolean((input().trim() || selectedImage()) && !props.disabled);

  return (
    <form
      onSubmit={handleSubmit}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      class={`p-3 bg-white border-t border-forest/10 relative transition-colors ${
        isDragging() ? "bg-sage/20 border-forest/40" : ""
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFileInputChange}
        class="hidden"
      />

      <Show when={uploadError()}>
        <div class="mb-2 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 text-[11px] flex items-center justify-between">
          <span>{uploadError()}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            class="text-red-500 hover:text-red-800 ml-2"
          >
            <span class="material-icons text-xs">close</span>
          </button>
        </div>
      </Show>

      {/* Selected Image Thumbnail Preview */}
      <Show when={selectedImage()}>
        {(img) => (
          <div class="mb-2.5 p-2 rounded-xl bg-forest/[0.04] border border-forest/10 flex items-center gap-2.5">
            <div class="relative group shrink-0">
              <img
                src={img().base64}
                alt="Selected receipt preview"
                class="w-12 h-12 object-cover rounded-lg border border-forest/15 shadow-sm"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-forest truncate">{img().fileName}</p>
              <p class="text-[10px] text-earth/70 flex items-center gap-1 mt-0.5">
                <span class="material-icons text-xs text-forest/70">receipt_long</span>
                <span>Receipt / Image attached (OCR enabled)</span>
              </p>
            </div>
            <button
              type="button"
              onClick={removeSelectedImage}
              class="w-6 h-6 rounded-full hover:bg-forest/10 text-earth flex items-center justify-center transition-colors cursor-pointer"
              title="Remove image"
            >
              <span class="material-icons text-sm">close</span>
            </button>
          </div>
        )}
      </Show>

      {/* Drag & Drop Visual Overlay */}
      <Show when={isDragging()}>
        <div class="absolute inset-0 bg-forest/5 backdrop-blur-[1px] border-2 border-dashed border-forest/40 rounded-t-xl z-20 flex items-center justify-center pointer-events-none">
          <div class="flex items-center gap-2 text-forest text-xs font-semibold">
            <span class="material-icons text-lg">cloud_upload</span>
            <span>Drop receipt or image here</span>
          </div>
        </div>
      </Show>

      <div class="flex gap-2 items-center">
        {/* Upload Image Button */}
        <button
          type="button"
          onClick={() => fileInputRef?.click()}
          disabled={props.disabled}
          class="shrink-0 w-9 h-9 rounded-xl border border-forest/15 text-forest/70 hover:text-forest hover:bg-forest/5 flex items-center justify-center disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-default"
          title="Upload receipt or screenshot"
          aria-label="Upload image"
        >
          <span class="material-icons text-lg">add_photo_alternate</span>
        </button>

        <textarea
          rows={2}
          value={input()}
          onInput={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          disabled={props.disabled}
          placeholder={
            selectedImage()
              ? "Add optional note (e.g. 'charge to BCA')..."
              : props.placeholder || "Ask about spending, budgets, or upload receipt…"
          }
          class="flex-1 resize-none px-3 py-2 text-xs rounded-xl border border-forest/15 bg-page-bg text-forest placeholder:text-earth/50 focus:outline-none focus:border-forest/40 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!canSubmit()}
          class="shrink-0 w-9 h-9 rounded-xl bg-forest text-white flex items-center justify-center disabled:opacity-40 hover:bg-forest/90 transition-colors cursor-pointer disabled:cursor-default"
          aria-label="Send message"
        >
          <span class="material-icons text-lg">send</span>
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
