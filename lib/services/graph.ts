interface MeetingInput {
  subject: string
  startDateTime: string
  endDateTime: string
}

export async function createOnlineMeeting(accessToken: string, input: MeetingInput): Promise<string> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me/onlineMeetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: input.subject,
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create Teams meeting: ${error}`)
  }

  const meeting = await response.json()
  return meeting.joinUrl || meeting.joinWebUrl
}

interface GraphUser {
  id: string
  displayName: string
  userPrincipalName: string
  mail: string | null
}

export async function getAppOnlyToken(): Promise<string> {
  const tenantId = process.env.MICROSOFT_TENANT_ID
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Microsoft credentials not configured")
  }

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get app-only token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

export async function fetchUsersFromGraph(): Promise<GraphUser[]> {
  if (process.env.FEATURE_CREATE_TEAMS_MEETING !== "true") {
    return []
  }

  try {
    const token = await getAppOnlyToken()
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,mail&$top=999",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      console.warn("Failed to fetch users from Graph API:", await response.text())
      return []
    }

    const data = await response.json()
    return data.value || []
  } catch (error) {
    console.warn("Could not fetch users from Microsoft Graph:", error)
    return []
  }
}
