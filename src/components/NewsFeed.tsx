import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNews, type NewsItem } from "@/hooks/useNews";
import { TrendingUp, TrendingDown, Zap, Minus } from "lucide-react";
import type { Sport } from "@/types/oracle";
import { formatDistanceToNowStrict } from "date-fns";

interface Props {
  sport?: Sport;
  limit?: number;
  variant?: "panel" | "stack";
}

/**
 * Single responsive news component. Replaces the old NewsFeed +
 * NewsFeedMobile + NewsFeedMobileAnimated trio.
 */
export function NewsFeed({ sport, limit = 12, variant = "stack" }: Props) {
  const { data, isLoading } = useNews(sport);
  const items = (data ?? []).slice(0, limit);
  const breaking = items.find(i => i.isBreaking);

  if (variant === "panel") {
    return (
      <Card>
        <CardHeader><CardTitle>News</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {isLoading && <Skeleton className="h-32 w-full" />}
          {breaking && <BreakingBanner item={breaking} />}
          {items.map((n, i) => <Row key={n.id} item={n} index={i} />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {isLoading && <Skeleton className="h-24 w-full" />}
      {breaking && <BreakingBanner item={breaking} />}
      {items.map((n, i) => <Row key={n.id} item={n} index={i} />)}
    </div>
  );
}

function BreakingBanner({ item }: { item: NewsItem }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 rounded-md bg-[hsl(var(--gold)/0.12)] border border-[hsl(var(--gold)/0.4)] px-3 py-2"
    >
      <Zap className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
      <p className="text-xs font-semibold truncate">{item.headline}</p>
    </motion.div>
  );
}

function Row({ item, index }: { item: NewsItem; index: number }) {
  const tone = item.sentimentScore > 0.2
    ? { Icon: TrendingUp, cls: "text-[hsl(var(--win))]" }
    : item.sentimentScore < -0.2
      ? { Icon: TrendingDown, cls: "text-[hsl(var(--loss))]" }
      : { Icon: Minus, cls: "text-muted-foreground" };
  const Inner = (
    <div className="flex items-start gap-2 text-xs py-2 border-b border-border last:border-0">
      <tone.Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${tone.cls}`} />
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{item.headline}</p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
          <Badge variant="outline" className="text-[9px] py-0">{item.sport}</Badge>
          <span>{formatDistanceToNowStrict(new Date(item.publishedAt), { addSuffix: true })}</span>
          {item.source && <span className="truncate">· {item.source}</span>}
        </div>
      </div>
    </div>
  );
  const animated = (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.18) }}
    >
      {Inner}
    </motion.div>
  );
  return item.url
    ? <a href={item.url} target="_blank" rel="noreferrer">{animated}</a>
    : animated;
}
