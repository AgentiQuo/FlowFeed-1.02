import axios from "axios";
import crypto from "crypto";

const X_API_V2_BASE = "https://api.twitter.com/2";
const X_API_V1_BASE = "https://api.twitter.com/1.1";

export interface XPostParams {
  text: string;
  imageUrl?: string;
  bearerToken: string;
}

export interface XMediaUploadParams {
  imageUrl: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

/**
 * Post text to X (Twitter)
 */
export async function postToX(params: XPostParams) {
  try {
    const payload: any = {
      text: params.text,
    };

    // If image URL provided, we would need to upload it first
    // For now, just post text
    if (params.imageUrl) {
      // Media upload would require OAuth 1.0a signature
      console.warn("Image posting to X requires additional setup");
    }

    const response = await axios.post(
      `${X_API_V2_BASE}/tweets`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${params.bearerToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: true,
      postId: response.data.data.id,
      platform: "x",
    };
  } catch (error: any) {
    console.error("X post error:", error.response?.data || error.message);
    throw new Error(`Failed to post to X: ${error.response?.data?.detail || error.message}`);
  }
}

/**
 * Upload media to X and get media ID for posting
 * Uses OAuth 1.0a signature
 */
export async function uploadMediaToX(params: XMediaUploadParams) {
  try {
    // Download image from URL
    const imageResponse = await axios.get(params.imageUrl, {
      responseType: "arraybuffer",
    });

    const imageData = Buffer.from(imageResponse.data).toString("base64");

    // Upload to X media endpoint
    const response = await axios.post(
      `${X_API_V1_BASE}/media/upload.json`,
      `media_data=${imageData}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: generateOAuth1Header(
            "POST",
            `${X_API_V1_BASE}/media/upload.json`,
            {
              oauth_consumer_key: params.apiKey,
              oauth_token: params.accessToken,
            },
            params.apiSecret,
            params.accessTokenSecret
          ),
        },
      }
    );

    return response.data.media_id_string;
  } catch (error: any) {
    console.error("X media upload error:", error.response?.data || error.message);
    throw new Error(`Failed to upload media to X: ${error.message}`);
  }
}

/**
 * Generate OAuth 1.0a Authorization header
 */
function generateOAuth1Header(
  method: string,
  url: string,
  oauthParams: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const params: Record<string, string> = {
    ...oauthParams,
    oauth_nonce: Math.random().toString(36).substring(2, 15),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
  };

  // Sort parameters
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  // Create signature base string
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // Generate signature
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  (params as Record<string, string>).oauth_signature = signature;

  // Build Authorization header
  const authHeader = Object.entries(params)
    .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
    .join(", ");

  return `OAuth ${authHeader}`;
}
