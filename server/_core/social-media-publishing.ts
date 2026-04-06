// Use native fetch available in Node.js 18+

export interface PublishResult {
  success: boolean;
  postId?: string;
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
        // Upload image to WordPress media library first
        const mediaResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2/media`, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${Buffer.from(`${wpUsername}:${wpAppPassword}`).toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title,
            source_url: imageUrl,
          }),
        });

        if (mediaResponse.ok) {
          const mediaData = (await mediaResponse.json()) as any;
          if (mediaData.id) {
            postData.featured_media = mediaData.id;
          }
        } else {
          const errorData = await mediaResponse.json();
          console.warn("[WordPress] Media upload failed:", errorData);
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
