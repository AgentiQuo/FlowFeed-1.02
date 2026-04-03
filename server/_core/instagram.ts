import axios from "axios";

const INSTAGRAM_GRAPH_API_BASE = "https://graph.instagram.com/v18.0";

export interface InstagramPostParams {
  imageUrl: string;
  caption: string;
  accountId: string;
  accessToken: string;
}

export interface InstagramCarouselParams {
  mediaUrls: string[];
  caption: string;
  accountId: string;
  accessToken: string;
}

/**
 * Post a single image to Instagram
 */
export async function postImageToInstagram(params: InstagramPostParams) {
  try {
    // Step 1: Create media container
    const containerResponse = await axios.post(
      `${INSTAGRAM_GRAPH_API_BASE}/${params.accountId}/media`,
      {
        image_url: params.imageUrl,
        caption: params.caption,
        access_token: params.accessToken,
      }
    );

    const containerId = containerResponse.data.id;

    // Step 2: Publish the media
    const publishResponse = await axios.post(
      `${INSTAGRAM_GRAPH_API_BASE}/${params.accountId}/media_publish`,
      {
        creation_id: containerId,
        access_token: params.accessToken,
      }
    );

    return {
      success: true,
      postId: publishResponse.data.id,
      platform: "instagram",
    };
  } catch (error: any) {
    console.error("Instagram post error:", error.response?.data || error.message);
    throw new Error(`Failed to post to Instagram: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Post a carousel (multiple images) to Instagram
 */
export async function postCarouselToInstagram(params: InstagramCarouselParams) {
  try {
    // Step 1: Create media containers for each image
    const mediaIds: string[] = [];

    for (const mediaUrl of params.mediaUrls) {
      const containerResponse = await axios.post(
        `${INSTAGRAM_GRAPH_API_BASE}/${params.accountId}/media`,
        {
          image_url: mediaUrl,
          is_carousel_item: true,
          access_token: params.accessToken,
        }
      );
      mediaIds.push(containerResponse.data.id);
    }

    // Step 2: Create carousel container
    const carouselResponse = await axios.post(
      `${INSTAGRAM_GRAPH_API_BASE}/${params.accountId}/media`,
      {
        media_type: "CAROUSEL",
        children: mediaIds,
        caption: params.caption,
        access_token: params.accessToken,
      }
    );

    const containerId = carouselResponse.data.id;

    // Step 3: Publish the carousel
    const publishResponse = await axios.post(
      `${INSTAGRAM_GRAPH_API_BASE}/${params.accountId}/media_publish`,
      {
        creation_id: containerId,
        access_token: params.accessToken,
      }
    );

    return {
      success: true,
      postId: publishResponse.data.id,
      platform: "instagram",
    };
  } catch (error: any) {
    console.error("Instagram carousel post error:", error.response?.data || error.message);
    throw new Error(`Failed to post carousel to Instagram: ${error.response?.data?.error?.message || error.message}`);
  }
}
