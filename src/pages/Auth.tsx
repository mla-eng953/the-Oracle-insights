import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

export default function Auth() {
  const { signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(mode: "signin" | "signup") {
    setErr(null); setLoading(true);
    const res = mode === "signin" ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);
    if (res.error) { setErr(res.error.message); return; }
    nav("/");
  }

  return (
    <PageTransition>
      <div className="min-h-dvh grid place-items-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>The Oracle</CardTitle>
            <p className="text-xs text-muted-foreground">Edge-focused betting intelligence.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Tabs defaultValue="signin">
              <TabsList className="w-full">
                <TabsTrigger value="signin" className="flex-1">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">Sign up</TabsTrigger>
              </TabsList>
              {(["signin", "signup"] as const).map(mode => (
                <TabsContent key={mode} value={mode} className="flex flex-col gap-2">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  {err && <p className="text-xs text-[hsl(var(--loss))]">{err}</p>}
                  <Button variant="gold" disabled={loading} onClick={() => submit(mode)}>
                    {mode === "signin" ? "Sign in" : "Create account"}
                  </Button>
                </TabsContent>
              ))}
            </Tabs>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" onClick={() => signInWithGoogle()}>Continue with Google</Button>
            <Button variant="outline" onClick={() => signInWithApple()}>Continue with Apple</Button>
            <p className="text-[10px] text-muted-foreground leading-snug">
              By continuing you agree to the <Link to="/compliance" className="underline">terms</Link>. 21+ only. Entertainment only.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
