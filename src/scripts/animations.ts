export function initFadeInImages() {
  document.querySelectorAll<HTMLElement>(".reveal-img").forEach((container) => {
    const picture = container.querySelector<HTMLElement>("picture");
    const imgElement = picture?.querySelector("img");

    if (!picture || !imgElement) return;

    const showImage = () => {
      picture.style.opacity = "1";
    };

    if (imgElement.complete && imgElement.naturalHeight !== 0) {
      // Image loaded from cache — show immediately without transition
      showImage();
    } else {
      // Image not cached — apply transition and wait for load
      picture.style.transition = "opacity 400ms ease-out, filter 400ms ease-out";
      picture.style.filter = "blur(10px)";
      imgElement.addEventListener(
        "load",
        () => {
          picture.style.filter = "blur(0)";
          showImage();
        },
        { once: true, passive: true }
      );
    }
  });
}
