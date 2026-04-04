// Use native fetch available in Node.js 18+

export interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
  platform: string;
}

/**
 * Instagram Graph API publishing
 * Requires: accessToken (businessAccountId is optional, will be fetched from API if not provided)
 */
export async function publishToInstagram(
  accessToken: string,
  businessAccountId: string,
  imageUrl: string,
  caption: string
): Promise<PublishResult> {
  try {
    // If businessAccountId is not provided, fetch it from Instagram API
    let accountId = businessAccountId;
    if (!accountId) {
      try {
        const meResponse = await fetch(
          `https://graph.instagram.com/v18.0/me?fields=instagram_business_account&access_token=${accessToken}`
        );
        if (meResponse.ok) {
          const meData = (await meResponse.json()) as any;
          accountId = meData.instagram_business_account?.id;
          if (!accountId) {
            return {
              success: false,
              platform: "instagram",
              error: "Could not retrieve Instagram business account ID. Please ensure your Instagram account is connected to a business account.",
            };
          }
        } else {
          const errorData = await meResponse.json().catch(() => ({}));
          const errorMsg = errorData.error?.message || `HTTP ${meResponse.status}`;
          return {
            success: false,
            platform: "instagram",
            error: `Failed to retrieve Instagram business account: ${errorMsg}. Please verify your access token is valid and your account is connected to a business account.`,
          };
        }
      } catch (e) {
        return {
          success: false,
          platform: "instagram",
          error: "Failed to retrieve Instagram business account ID",
        };
      }
    }

    // Step 1: Create media container
    const containerResponse = await fetch(
      `https://graph.instagram.com/v18.0/${accountId}/media`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: accessToken,
        }),
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.json();
      return {
        success: false,
        platform: "instagram",
        error: error.error?.message || "Failed to create media container",
      };
    }

    const containerData = (await containerResponse.json()) as any;
    const mediaId = containerData.id;

    // Step 2: Publish the media
    const publishResponse = await fetch(
      `https://graph.instagram.com/v18.0/${accountId}/media_publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creation_id: mediaId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      return {
        success: false,
        platform: "instagram",
        error: error.error?.message || "Failed to publish media",
      };
    }

    const publishData = (await publishResponse.json()) as any;
    return {
      success: true,
      postId: publishData.id,
      platform: "instagram",
    };
  } catch (error) {
    return {
      success: false,
      platform: "instagram",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * X (Twitter) API v2 publishing
 * Requires: bearerToken
 */
export async function publishToX(
  bearerToken: string,
  text: string,
  imageUrl?: string
): Promise<PublishResult> {
  try {
    let mediaId: string | undefined;

    // Step 1: Upload media if image URL provided
    if (imageUrl) {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return {
          success: false,
          platform: "x",
          error: "Failed to fetch image",
        };
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(imageBuffer);

      // Upload to X media endpoint
      const mediaFormData = new FormData();
      mediaFormData.append("media_data", new Blob([buffer]));

      const mediaUploadResponse = await fetch(
        "https://upload.twitter.com/1.1/media/upload.json",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
          body: mediaFormData,
        }
      );

      if (!mediaUploadResponse.ok) {
        const error = await mediaUploadResponse.json();
        return {
          success: false,
          platform: "x",
          error: (error as any).errors?.[0]?.message || "Failed to upload media",
        };
      }

      const mediaData = (await mediaUploadResponse.json()) as any;
      mediaId = mediaData.media_id_string;
    }

    // Step 2: Post tweet
    const tweetBody: any = {
      text: text,
    };

    if (mediaId) {
      tweetBody.media = {
        media_ids: [mediaId],
      };
    }

    const tweetResponse = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tweetBody),
    });

    if (!tweetResponse.ok) {
      const error = await tweetResponse.json();
      return {
        success: false,
        platform: "x",
        error: (error as any).errors?.[0]?.message || "Failed to post tweet",
      };
    }

    const tweetData = (await tweetResponse.json()) as any;
    return {
      success: true,
      postId: tweetData.data.id,
      platform: "x",
    };
  } catch (error) {
    return {
      success: false,
      platform: "x",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * LinkedIn API publishing
 * Requires: accessToken, personId
 */
export async function publishToLinkedIn(
  accessToken: string,
  personId: string,
  text: string,
  imageUrl?: string
): Promise<PublishResult> {
  try {
    const postData: any = {
      author: `urn:li:person:${personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.Share": {
          media: [],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    // Add text
    if (text) {
      postData.specificContent["com.linkedin.ugc.Share"].shareCommentary = {
        text: text,
      };
    }

    // Add image if provided
    if (imageUrl) {
      postData.specificContent["com.linkedin.ugc.Share"].media = [
        {
          status: "READY",
          media: imageUrl,
          title: {
            text: "Post Image",
          },
        },
      ];
    }

    const response = await fetch(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        platform: "linkedin",
        error: (error as any).message || "Failed to post to LinkedIn",
      };
    }

    const data = (await response.json()) as any;
    return {
      success: true,
      postId: data.id,
      platform: "linkedin",
    };
  } catch (error) {
    return {
      success: false,
      platform: "linkedin",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Facebook API publishing
 * Requires: accessToken, pageId
 */
export async function publishToFacebook(
  accessToken: string,
  pageId: string,
  text: string,
  imageUrl?: string
): Promise<PublishResult> {
  try {
    const postData: any = {
      message: text,
      access_token: accessToken,
    };

    if (imageUrl) {
      postData.picture = imageUrl;
      postData.link = imageUrl;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/feed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        platform: "facebook",
        error: (error as any).error?.message || "Failed to post to Facebook",
      };
    }

    const data = (await response.json()) as any;
    return {
      success: true,
      postId: data.id,
      platform: "facebook",
    };
  } catch (error) {
    return {
      success: false,
      platform: "facebook",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
