import { invokeLLM } from "./llm";

interface InstagramInsightsMetrics {
  likes?: number;
  comments?: number;
  impressions?: number;
  reach?: number;
  engagement?: number;
  views?: number;
}

/**
 * Fetch insights for a specific Instagram media post
 * @param mediaId - Instagram media ID
 * @param accessToken - Instagram access token
 * @returns Metrics for the media
 */
export async function fetchInstagramMediaInsights(
  mediaId: string,
  accessToken: string
): Promise<InstagramInsightsMetrics> {
  try {
    const metrics = [
      "engagement",
      "impressions",
      "reach",
      "likes",
      "comments",
      "views",
    ].join(",");

    const url = `https://graph.instagram.com/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Failed to fetch Instagram insights: ${response.status} ${response.statusText}`
      );
      return {};
    }

    const data = (await response.json()) as any;

    // Parse the insights response
    const result: InstagramInsightsMetrics = {};

    if (data.data && Array.isArray(data.data)) {
      for (const metric of data.data) {
        const metricName = metric.name as string;
        const value =
          metric.values && metric.values.length > 0
            ? metric.values[0].value
            : 0;

        switch (metricName) {
          case "engagement":
            result.engagement = value;
            break;
          case "impressions":
            result.impressions = value;
            break;
          case "reach":
            result.reach = value;
            break;
          case "likes":
            result.likes = value;
            break;
          case "comments":
            result.comments = value;
            break;
          case "views":
            result.views = value;
            break;
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Error fetching Instagram insights:", error);
    return {};
  }
}

/**
 * Fetch insights for an Instagram business account
 * @param accountId - Instagram account ID
 * @param accessToken - Instagram access token
 * @returns Account-level metrics
 */
export async function fetchInstagramAccountInsights(
  accountId: string,
  accessToken: string
): Promise<Record<string, number>> {
  try {
    const metrics = [
      "impressions",
      "reach",
      "profile_views",
      "follower_count",
    ].join(",");

    const url = `https://graph.instagram.com/${accountId}/insights?metric=${metrics}&period=day&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Failed to fetch Instagram account insights: ${response.status} ${response.statusText}`
      );
      return {};
    }

    const data = (await response.json()) as any;

    // Parse the insights response
    const result: Record<string, number> = {};

    if (data.data && Array.isArray(data.data)) {
      for (const metric of data.data) {
        const metricName = metric.name as string;
        const value =
          metric.values && metric.values.length > 0
            ? metric.values[0].value
            : 0;
        result[metricName] = value;
      }
    }

    return result;
  } catch (error) {
    console.error("Error fetching Instagram account insights:", error);
    return {};
  }
}
