export async function triggerTask<TPayload extends object>(taskId: string, payload: TPayload) {
  const response = await fetch(`/api/trigger/${taskId}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to trigger ${taskId}`);
  }

  return response.json();
}

