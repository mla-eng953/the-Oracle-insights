import { PageTransition } from "@/components/PageTransition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Zap, Users, Scale } from "lucide-react";

const SPREAD_ROWS = [
  { match: "BOS -4.5", books: [{ book: "Book A", line: "-4.5 (-108)" }, { book: "Book B", line: "-4.0 (-110)" }, { book: "Book C", line: "-4.5 (-112)" }], best: "Book B" },
  { match: "DEN -6", books: [{ book: "Book A", line: "-6 (-115)" }, { book: "Book B", line: "-5.5 (-110)" }, { book: "Book C", line: "-6 (-118)" }], best: "Book B" },
];

const STEAM = [
  { match: "BOS vs MIL", before: "-3.5 (-108)", after: "-4.5 (-108)", ts: "14m ago" },
  { match: "KC vs BUF", before: "KC -2 (-110)", after: "KC -1 (-105)", ts: "32m ago" },
];

const PUBLIC = [
  { match: "DEN vs PHX", side: "Over 229", pub: 71, sharp: 44 },
  { match: "LAD vs SD", side: "LAD ML", pub: 62, sharp: 55 },
];

export default function MarketIntel() {
  return (
    <PageTransition>
      <div className="flex flex-col gap-4 py-3">
        <header>
          <h1 className="text-xl font-semibold">Market Intel</h1>
          <p className="text-xs text-muted-foreground">Line shop, sharp vs public, steam, implied skew.</p>
        </header>

        <Tabs defaultValue="shop">
          <TabsList>
            <TabsTrigger value="shop"><Scale className="h-3 w-3 mr-1" />Shop</TabsTrigger>
            <TabsTrigger value="steam"><Zap className="h-3 w-3 mr-1" />Steam</TabsTrigger>
            <TabsTrigger value="public"><Users className="h-3 w-3 mr-1" />Public</TabsTrigger>
            <TabsTrigger value="skew"><TrendingUp className="h-3 w-3 mr-1" />Skew</TabsTrigger>
          </TabsList>

          <TabsContent value="shop">
            <div className="grid gap-2">
              {SPREAD_ROWS.map((row) => (
                <Card key={row.match}>
                  <CardHeader className="pb-2"><CardTitle>{row.match}</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="grid grid-cols-3 gap-2">
                      {row.books.map(b => (
                        <li key={b.book} className={`rounded-md border p-2 text-center ${row.best === b.book ? "border-[hsl(var(--gold))]" : "border-border"}`}>
                          <p className="text-[10px] text-muted-foreground">{b.book}</p>
                          <p className="tabular-mono text-sm font-semibold">{b.line}</p>
                          {row.best === b.book && <Badge variant="gold" className="mt-1">Best</Badge>}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="steam">
            <div className="grid gap-2">
              {STEAM.map((s, i) => (
                <Card key={i}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{s.match}</p>
                      <p className="tabular-mono text-xs text-muted-foreground">
                        {s.before} <TrendingUp className="inline h-3 w-3 text-[hsl(var(--win))]" /> {s.after}
                      </p>
                    </div>
                    <Badge variant="outline">{s.ts}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="public">
            <div className="grid gap-2">
              {PUBLIC.map((p, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{p.match}</p>
                      <p className="text-xs text-muted-foreground">{p.side}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 tabular-mono">
                        <Users className="h-3 w-3" /> Public {p.pub}%
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-mono">
                        <TrendingDown className="h-3 w-3" /> Sharp {p.sharp}%
                      </span>
                      {p.pub - p.sharp > 20 && <Badge variant="gold">Fade spot</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="skew">
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                Implied probability skew vs model probability across live markets. Populated when Odds API + model outputs are live.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
