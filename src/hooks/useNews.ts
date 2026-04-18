import { useQuery } from "@tanstack/react-query";
import { invokeFn } from "@/lib/supabase";
import { QK, QueryTiming } from "@/lib/queryKeys";
import type { Sport } from "@/types/oracle";
import { MOCK_NEWS } from "@/lib/mockData";

export interface NewsItem {
  id: string;
  headline: string;
  summary?: string;
  sport: Sport | string;
  sentimentScore: number;
  publishedAt: string;
  source?: string;
  url?: string;
  isBreaking?: boolean;
}

export function useNews(sport?: Sport) {
  return useQuery({
    queryKey: QK.news(sport),
    queryFn: async (): Promise<NewsItem[]> => {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        return sport ? MOCK_NEWS.filter(n => n.sport === sport) as NewsItem[] : MOCK_NEWS as NewsItem[];
      }
      const { data, error } = await invokeFn<NewsItem[]>("sports-news", { sport });
      if (error) return [];
      return data ?? [];
    },
    ...QueryTiming.PICKS,
  });
}
