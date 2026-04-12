// Use native fetch available in Node.js 18+
import OAuth from "oauth-1.0a";
import crypto from "crypto";

export interface PublishResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
  platform: string;
}

/**
 * Instagram Graph API publishing
 * Requires: accessToken (businessAccountId is optional, will be fetched from /me endpoint if not provided)
 */
export async function publishToInstagram(
  accessToken: string,
  businessAccountId: string,
  imageUrl: string,
  caption: string
): Promise<PublishResult> {
  try {
    // If businessAccountId is not provided, fetch it from Instagram API using /me endpoint
    let accountId = businessAccountId;
    if (!accountId) {
      try {
        // Use the /me endpoint to get the IG_USER_ID (which is the business account ID)
        // For Instagram Business Login tokens, use 'user_id' field (not 'id')
        // 'id' returns app-scoped ID, 'user_id' returns the actual IG_ID needed for publishing
        const meResponse = await fetch(
          `https://graph.instagram.com/v18.0/me?fields=user_id&access_token=${accessToken}`
        );
        
        const meData = (await meResponse.json()) as any;
        
        if (meData.error) {
          const errorMsg = meData.error.message || "Unknown error";
          return {
            success: false,
            platform: "instagram",
            error: `Failed to retrieve Instagram account: ${errorMsg}. Make sure your token is valid and has instagram_business_basic scope.`,
          };
        }
        
        if (meData.user_id) {
          accountId = meData.user_id;
        } else {
          return {
            success: false,
            platform: "instagram",
            error: "Could not retrieve Instagram account ID. Please ensure your token is valid and your account is a business account.",
          };
        }
      } catch (e) {
        return {
          success: false,
          platform: "instagram",
          error: `Failed to retrieve Instagram account: ${(e as Error).message}`,
        };
      }
    }

    // Step 1: Create media container
    const requestBody = {
      image_url: imageUrl,
      caption: caption,
      access_token: accessToken,
    };
    console.log("[Instagram] Creating media container with:", {
      accountId,
      imageUrl,
      captionLength: caption.length,
      captionPreview: caption.substring(0, 100),
    });
    
    const containerResponse = await fetch(
      `https://graph.instagram.com/v18.0/${accountId}/media`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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
    console.log("[Instagram] Media container response:", containerData);
    const mediaId = containerData.id;

    if (!mediaId) {
      console.error("[Instagram] No media ID in response:", containerData);
      return {
        success: false,
        platform: "instagram",
        error: `Failed to create media container: No media ID returned. Response: ${JSON.stringify(containerData)}`,
      };
    }

    // Step 2: Publish the media
    // Instagram needs time to process the media before publishing
    // Wait 2 seconds to ensure media is ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("[Instagram] Publishing media with creation_id:", mediaId);
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
      console.error("[Instagram] Publish failed with status", publishResponse.status, ":", error);
      return {
        success: false,
        platform: "instagram",
        error: error.error?.message || "Failed to publish media",
      };
    }

    const publishData = (await publishResponse.json()) as any;
    console.log("[Instagram] Publish successful, post ID:", publishData.id);
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
 * Create an OAuth 1.0a instance for X/Twitter API signing
 */
function createOAuth(consumerKey: string, consumerSecret: string): OAuth {
  return new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString: string, key: string) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });
}

/**
 * X (Twitter) API v2 publishing
 * Requires: apiKey (Consumer Key), apiSecret (Consumer Secret), accessToken, accessTokenSecret
 * Uses OAuth 1.0a user-context authentication for posting tweets
 */
export async function publishToX(
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  text: string,
  imageUrl?: string
): Promise<PublishResult> {
  try {
    const oauth = createOAuth(apiKey, apiSecret);
    const token: OAuth.Token = { key: accessToken, secret: accessTokenSecret };

    let mediaId: string | undefined;

    // Step 1: Upload media if image URL provided
    if (imageUrl) {
      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.warn("[X] Failed to fetch image, posting without media:", imageUrl);
        } else {
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64Data = Buffer.from(imageBuffer).toString("base64");

          // Use v1.1 media upload with OAuth 1.0a and base64 media_data
          const mediaUrl = "https://upload.twitter.com/1.1/media/upload.json";
          const mediaRequestData = {
            url: mediaUrl,
            method: "POST",
            data: { media_data: base64Data },
          };

          const mediaAuthHeader = oauth.toHeader(oauth.authorize(mediaRequestData, token));

          // Send as application/x-www-form-urlencoded
          const mediaUploadResponse = await fetch(mediaUrl, {
            method: "POST",
            headers: {
              ...mediaAuthHeader,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `media_data=${encodeURIComponent(base64Data)}`,
          });

          if (!mediaUploadResponse.ok) {
            const errorText = await mediaUploadResponse.text();
            console.warn("[X] Media upload failed, posting without image:", errorText);
          } else {
            const mediaData = (await mediaUploadResponse.json()) as any;
            mediaId = mediaData.media_id_string;
            console.log("[X] Media uploaded successfully, media_id:", mediaId);
          }
        }
      } catch (e) {
        console.warn("[X] Media upload error, posting without image:", e);
      }
    }

    // Step 2: Post tweet using v2 API with OAuth 1.0a
    const tweetUrl = "https://api.twitter.com/2/tweets";
    const tweetBody: any = { text };

    if (mediaId) {
      tweetBody.media = { media_ids: [mediaId] };
    }

    // For v2 JSON body, we sign the request without body params
    const tweetRequestData = {
      url: tweetUrl,
      method: "POST",
    };

    const tweetAuthHeader = oauth.toHeader(oauth.authorize(tweetRequestData, token));

    console.log("[X] Posting tweet to v2 API...");
    const tweetResponse = await fetch(tweetUrl, {
      method: "POST",
      headers: {
        ...tweetAuthHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tweetBody),
    });

    if (!tweetResponse.ok) {
      const errorBody = await tweetResponse.text();
      let errorMsg: string;
      try {
        const errorJson = JSON.parse(errorBody);
        errorMsg = errorJson.detail || errorJson.errors?.[0]?.message || errorJson.title || errorBody;
      } catch {
        errorMsg = errorBody;
      }
      console.error("[X] Tweet failed:", tweetResponse.status, errorMsg);
      return {
        success: false,
        platform: "x",
        error: `X API error (${tweetResponse.status}): ${errorMsg}`,
      };
    }

    const tweetData = (await tweetResponse.json()) as any;
    const tweetId = tweetData.data?.id;
    console.log("[X] Tweet posted successfully, ID:", tweetId);
    return {
      success: true,
      postId: tweetId,
      postUrl: tweetId ? `https://x.com/i/status/${tweetId}` : undefined,
      platform: "x",
    };
  } catch (error) {
    console.error("[X] Publish error:", error);
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


/**
 * WordPress REST API publishing
 * Requires: wpUsername, wpAppPassword, wpSiteUrl (from environment or config)
 */
export async function publishToWordPress(
  wpUsername: string,
  wpAppPassword: string,
  title: string,
  content: string,
  imageUrl?: string,
  categories?: string[]
): Promise<PublishResult> {
  try {
    const wpSiteUrl = process.env.WORDPRESS_SITE_URL || "https://www.modern-villas.com";
    const apiUrl = `${wpSiteUrl}/wp-json/wp/v2/posts`;

    // Prepare post data
    const postData: any = {
      title,
      content,
      status: "publish",
    };

    // Add featured image if provided
    if (imageUrl) {
      try {
        // Download the image bytes first, then upload as binary to WordPress media library
        const imgResponse = await fetch(imageUrl);
        if (imgResponse.ok) {
          const imgBuffer = await imgResponse.arrayBuffer();
          const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
          const filename = imageUrl.split("/").pop()?.split("?")[0] || "image.jpg";

          const mediaResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2/media`, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${Buffer.from(`${wpUsername}:${wpAppPassword}`).toString("base64")}`,
              "Content-Disposition": `attachment; filename="${filename}"`,
              "Content-Type": contentType,
            },
            body: imgBuffer,
          });

          if (mediaResponse.ok) {
            const mediaData = (await mediaResponse.json()) as any;
            if (mediaData.id) {
              postData.featured_media = mediaData.id;
              console.log("[WordPress] Featured image uploaded, media ID:", mediaData.id);
            }
          } else {
            const errorData = await mediaResponse.json().catch(() => ({}));
            console.warn("[WordPress] Media upload failed:", errorData);
          }
        } else {
          console.warn("[WordPress] Could not download image from URL:", imageUrl);
        }
      } catch (e) {
        console.warn("[WordPress] Failed to upload featured image:", e);
        // Continue without featured image
      }
    }

    // Add categories if provided (default: DESIGN and ARCHITECTURE)
    if (categories && categories.length > 0) {
      try {
        // Get category IDs from names
        const categoryIds: number[] = [];
        for (const categoryName of categories) {
          const catResponse = await fetch(
            `${wpSiteUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(categoryName)}`,
            {
              headers: {
                "Authorization": `Basic ${Buffer.from(`${wpUsername}:${wpAppPassword}`).toString("base64")}`,
              },
            }
          );
          if (catResponse.ok) {
            const catData = (await catResponse.json()) as any[];
            if (catData.length > 0) {
              categoryIds.push(catData[0].id);
            }
          }
        }
        if (categoryIds.length > 0) {
          postData.categories = categoryIds;
        }
      } catch (e) {
        console.warn("[WordPress] Failed to add categories:", e);
        // Continue without categories
      }
    }

    // Create the post
    console.log("[WordPress] Publishing post to:", apiUrl);
    console.log("[WordPress] Post data:", { title, contentLength: content.length, hasImage: !!imageUrl });
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${wpUsername}:${wpAppPassword}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });

    console.log("[WordPress] Response status:", response.status, response.statusText);

    if (!response.ok) {
      let error: any;
      try {
        error = await response.json();
      } catch (e) {
        error = { message: await response.text() };
      }
      console.error("[WordPress] API error response:", { status: response.status, statusText: response.statusText, error });
      return {
        success: false,
        platform: "website",
        error: (error as any).message || `Failed to post to WordPress (${response.status}: ${response.statusText})`,
      };
    }

    const data = (await response.json()) as any;
    
    console.log("[WordPress] Success response:", { id: data.id, link: data.link, status: data.status });
    if (!data.id) {
      console.error("[WordPress] No post ID in response:", data);
      return {
        success: false,
        platform: "website",
        error: "Failed to create post: No ID returned from WordPress",
      };
    }
    
    return {
      success: true,
      postId: data.id.toString(),
      platform: "website",
    };
  } catch (error) {
    return {
      success: false,
      platform: "website",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
