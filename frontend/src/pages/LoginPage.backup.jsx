import { Button } from "@/components/ui/button";
import { CheckSquare, Sparkle, ListChecks, Calendar, Star } from "@phosphor-icons/react";

export default function LoginPage() {
  const handleLogin = () => {
    const demoUser = {
      name: "Ugur Can",
      email: "uqr949@gmail.com",
      provider: "local",
      loggedInAt: new Date().toISOString(),
    };

    localStorage.setItem("todo_user", JSON.stringify(demoUser));
    localStorage.setItem("auth_user", JSON.stringify(demoUser));
    localStorage.setItem("isAuthenticated", "true");

    window.location.href = "/app";
  };

 return (
  <>
    <div className="tailwind-test-box">Tailwind Test</div>

    <div className="min-h-screen bg-[#F8F9FA] flex flex-col" data-testid="login-page">
      {/* Top nav */}
      <nav className="px-8 py-6 flex items-center justify-between border-b border-slate-200 bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-[#002FA7] flex items-center justify-center text-white">
            <CheckSquare size={22} weight="bold" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">
            Sneezy Aksesuar
          </span>
        </div>

        <Button
          onClick={handleLogin}
          className="bg-[#002FA7] hover:bg-[#00227A] text-white rounded-none h-10 px-5 font-medium"
          data-testid="login-nav-button"
        >
          Giriş Yap
        </Button>
      </nav>

      {/* Hero */}
      <main className="flex-1 grid lg:grid-cols-2 max-w-7xl mx-auto w-full px-8 py-16 gap-16 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-700">
            <Sparkle size={14} weight="fill" className="text-[#002FA7]" />
            Akıllı Görev Yönetimi
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 leading-[1.05]">
            Görevlerinizi <span className="text-[#002FA7]">daha düzenli</span>{" "}
            yönetin.
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
            Günlük işler, ürün toplama görevleri, yapılacaklar ve tamamlananlar için
            sade, hızlı ve kullanımı kolay bir görev takip ekranı. Listelerinizi oluşturun,
            görevlerinizi takip edin ve iş akışınızı daha düzenli hale getirin.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleLogin}
              className="bg-[#002FA7] hover:bg-[#00227A] text-white rounded-none h-12 px-8 text-base font-medium"
              data-testid="login-hero-button"
            >
              Uygulamaya Başla
            </Button>

            <Button
              variant="outline"
              className="rounded-none h-12 px-6 border-slate-300 text-base font-medium"
              onClick={() =>
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
              }
              data-testid="login-features-button"
            >
              Özellikleri Gör
            </Button>
          </div>

          <div className="flex items-center gap-6 pt-4 text-sm text-slate-500">
            <span>✓ Hızlı kullanım</span>
            <span>✓ Liste bazlı takip</span>
            <span>✓ Temiz arayüz</span>
          </div>
        </div>

        {/* Right preview card */}
        <div className="relative">
          <div className="absolute -inset-3 bg-gradient-to-br from-[#002FA7]/5 to-purple-500/5 -z-10"></div>

          <div className="bg-white border border-slate-200 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)]">
            <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">
                  Bugün
                </div>
                <div className="font-display text-xl font-bold mt-1">
                  Günlük Görevler
                </div>
              </div>
              <Sparkle size={20} weight="fill" className="text-[#002FA7]" />
            </div>

            <div className="divide-y divide-slate-100">
              {[
                {
                  t: "Gelen siparişleri kontrol et",
                  d: "09:30",
                  s: true,
                  c: false,
                },
                {
                  t: "Ürün toplama listesini hazırla",
                  d: "Bugün",
                  s: false,
                  c: false,
                },
                {
                  t: "Tamamlanan ürünleri kontrol et",
                  d: "Bugün",
                  s: false,
                  c: true,
                },
                {
                  t: "Eksik stokları not al",
                  d: null,
                  s: false,
                  c: false,
                },
              ].map((it, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50"
                >
                  <div
                    className={`w-5 h-5 border ${
                      it.c
                        ? "border-[#002FA7] bg-[#002FA7]"
                        : "border-slate-300"
                    } flex items-center justify-center`}
                  >
                    {it.c && (
                      <CheckSquare size={14} weight="bold" className="text-white" />
                    )}
                  </div>

                  <span
                    className={`flex-1 ${
                      it.c ? "task-strike" : "text-slate-800"
                    }`}
                  >
                    {it.t}
                  </span>

                  {it.d && <span className="text-xs text-slate-500">{it.d}</span>}

                  <Star
                    size={16}
                    weight={it.s ? "fill" : "regular"}
                    className={it.s ? "text-amber-500" : "text-slate-300"}
                  />
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 p-4 flex items-center gap-2 ai-glow">
              <Sparkle size={16} weight="fill" className="text-[#002FA7]" />
              <span className="text-sm font-medium text-slate-700">
                Örnek: “Bugün gelen siparişleri topla” şeklinde görev ekleyin.
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Features */}
      <section id="features" className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500 mb-3">
            Neden Sneezy Görev Takip?
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-12 max-w-2xl">
            İş takibinde sade, hızlı ve kontrollü bir yapı.
          </h2>

          <div className="grid md:grid-cols-3 gap-px bg-slate-200 border border-slate-200">
            {[
              {
                icon: ListChecks,
                title: "Akıllı Listeler",
                desc: "Bugün, Önemli, Planlanan ve Tamamlanan görevleri ayrı ayrı takip edin.",
              },
              {
                icon: Calendar,
                title: "Günlük İş Akışı",
                desc: "Sipariş, ürün toplama, stok kontrol ve operasyon görevlerini tek alanda yönetin.",
              },
              {
                icon: Sparkle,
                title: "Temiz Arayüz",
                desc: "Karmaşık ekranlar olmadan, hızlı ve anlaşılır görev yönetimi deneyimi.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-white p-8 hover:bg-slate-50 transition-colors"
                data-testid={`feature-${i}`}
              >
                <f.icon size={32} weight="duotone" className="text-[#002FA7] mb-5" />
                <h3 className="font-display text-xl font-semibold mb-2">
                  {f.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-8 py-8 text-sm text-slate-500 flex justify-between max-w-7xl mx-auto w-full">
        <span>© 2026 Sneezy Aksesuar</span>
        <span>Görev takip sistemi</span>
      </footer>
     </div>
  </>
  );
}