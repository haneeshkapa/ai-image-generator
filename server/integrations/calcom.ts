import type { Lead } from "@shared/schema";

const DEFAULT_BASE_URL = "https://api.cal.com/v1";

export async function createCalBooking(lead: Lead, notes?: string) {
  const apiKey = process.env.CALCOM_API_KEY;
  const eventType = process.env.CALCOM_EVENT_TYPE;
  if (!apiKey || !eventType) {
    throw new Error("Cal.com integration not configured");
  }

  const baseUrl = process.env.CALCOM_BASE_URL || DEFAULT_BASE_URL;
  const payload = {
    eventType,
    attendee: {
      name: lead.name || "Prospect",
      email: lead.email || `lead-${lead.id}@opswatch.local`,
    },
    notes,
    metadata: {
      leadId: lead.id,
      source: lead.source,
    },
  };

  const response = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cal.com booking failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const url = data?.booking?.invitee?.joinUrl || data?.booking?.responses?.join_url || data?.booking?.metadata?.url;
  return { id: data?.booking?.id, url };
}
