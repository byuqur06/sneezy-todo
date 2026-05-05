import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Eye,
  EyeSlash,
  Moon,
  Sun,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginLocalUser } from "@/lib/localAuth";
import { toast } from "sonner";

const SNEEZY_LOGO =
  "https://www.sneezy.com.tr/idea/ny/93/myassets/std_theme_files/tpl-aredian/assets/uploads/logo.png?revision=1777119010";

export default function LoginPage({ theme = "light", toggleTheme = () => {} }) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
  e.preventDefault();

  if (!username.trim() || !password.trim()) {
    toast.error("Kullanıcı adı ve şifre zorunludur");
    return;
  }

  setLoading(true);

  try {
    const result = await loginLocalUser(username.trim(), password.trim());

    if (!result.ok) {
      toast.error(result.message || "Giriş başarısız");
      setLoading(false);
      return;
    }

    toast.success("Giriş başarılı");
    navigate("/app", { replace: true });
  } catch {
    toast.error("Sunucu bağlantısı kurulamadı");
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Theme button */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-5 right-5 z-20 h-10 px-4 border border-slate-200 bg-white/90 backdrop-blur text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
      >
        {theme === "dark" ? (
          <>
            <Sun size={17} />
            Aydınlık Tema
          </>
        ) : (
          <>
            <Moon size={17} />
            Karanlık Tema
          </>
        )}
      </button>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] bg-red-100 rounded-full blur-3xl opacity-70" />
        <div className="absolute top-1/3 -right-36 w-[460px] h-[460px] bg-slate-200 rounded-full blur-3xl opacity-70" />
        <div className="absolute bottom-0 left-1/3 w-[360px] h-[360px] bg-white rounded-full blur-3xl opacity-80" />
      </div>

      <div className="w-full max-w-6xl grid lg:grid-cols-[1.08fr_0.92fr] bg-white border border-slate-200 shadow-[0_30px_120px_rgba(15,23,42,0.13)] relative z-10 overflow-hidden">
        {/* Left brand panel */}
        <div className="hidden lg:flex flex-col justify-between bg-slate-950 text-white p-10 xl:p-12 min-h-[660px] relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,_#ef4444,_transparent_32%),radial-gradient(circle_at_bottom_right,_#ffffff,_transparent_25%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent" />

          <div className="relative">
            <div className="inline-flex mb-10">
  <img
    src={SNEEZY_LOGO}
    alt="Sneezy"
    className="h-14 w-auto object-contain"
  />
</div>

            <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 text-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] mb-6">
              <ShieldCheck size={15} weight="fill" className="text-red-400" />
              Operasyon Paneli
            </div>

            <h1 className="font-display text-5xl font-black tracking-tight leading-[1.05]">
              Sneezy Görev
              <br />
              Yönetim Sistemi
            </h1>

            <p className="text-slate-300 mt-6 text-base leading-relaxed max-w-md">
              Ürün toplama, sipariş aktarımı, stok kodu odaklı görev akışı ve
              ekip yönetimi için tasarlanmış özel Sneezy operasyon ekranı.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-3">
            <FeatureItem text="Excel data ile stok kodu ve barkod eşleştirme" />
            <FeatureItem text="Admin ve personel için ayrı yetki yapısı" />
            <FeatureItem text="Ürün görselleri, adet düşme ve liste bazlı görev takibi" />
          </div>
        </div>

        {/* Login panel */}
        <div className="px-6 sm:px-10 py-8 sm:py-12 flex flex-col justify-center">
          <div className="lg:hidden mb-8 flex justify-center">
            <img
              src={SNEEZY_LOGO}
              alt="Sneezy"
              className="h-12 w-auto object-contain"
            />
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 border border-red-100 bg-red-50 text-red-700 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] mb-5">
              <ShieldCheck size={15} weight="fill" />
              Yetkili Giriş
            </div>

            <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Hesabınıza giriş yapın
            </h2>

            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              Sadece tanımlı ve aktif Sneezy kullanıcıları görev paneline
              erişebilir.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Kullanıcı Adı
              </label>

              <div className="mt-2 flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 focus-within:border-red-500 transition-colors">
                <User size={18} className="text-slate-400" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border-0 bg-transparent rounded-none focus-visible:ring-0 shadow-none h-12 px-0"
                  placeholder="Kullanıcı adı"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Şifre
              </label>

              <div className="mt-2 flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 focus-within:border-red-500 transition-colors">
                <Lock size={18} className="text-slate-400" />

                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-0 bg-transparent rounded-none focus-visible:ring-0 shadow-none h-12 px-0"
                  placeholder="Şifre"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  title={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-none bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {loading ? "Giriş yapılıyor..." : "Uygulamaya Giriş Yap"}
              {!loading && <ArrowRight size={18} className="ml-2" />}
            </Button>
          </form>

          <div className="mt-8 border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 mb-2">
              Yetki Bilgilendirmesi
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Data yönetimi, sipariş aktarımı ve kullanıcı işlemleri yalnızca
              admin hesabında görünür. Personel kullanıcılar günlük görev ve
              ürün toplama ekranlarını kullanır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ text }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-200">
      <CheckCircle size={18} className="text-red-400" weight="fill" />
      <span>{text}</span>
    </div>
  );
}