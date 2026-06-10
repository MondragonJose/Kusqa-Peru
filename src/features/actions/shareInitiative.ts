export async function shareInitiative(title: string, url: string): Promise<void> {
  const shareData: ShareData = { title, url };

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch {
      // user cancelled or fallback to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(url);
  } catch {
    console.warn("[KUSQA SHARE] clipboard unavailable");
  }
}
