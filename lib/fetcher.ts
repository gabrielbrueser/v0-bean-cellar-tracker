/**
 * Shared SWR fetcher that throws on non-2xx responses.
 * This ensures SWR error states are properly triggered.
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  
  if (!res.ok) {
    // Check if we got HTML instead of JSON (likely redirected to login)
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const error = new Error("Session expired - please refresh") as Error & { status: number };
      error.status = 401;
      throw error;
    }
    
    // Try to parse error message from JSON response
    let errorMessage = res.statusText;
    try {
      const data = await res.json();
      if (data?.error) {
        errorMessage = data.error;
      }
    } catch {
      // Response wasn't JSON, use statusText
    }
    
    const error = new Error(errorMessage) as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  
  return res.json();
}
