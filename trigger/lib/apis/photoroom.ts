export async function transparentFallback(imageUrl: string): Promise<string> {
  void imageUrl;
  throw new Error("Photoroom fallback is not configured yet.");
}
