import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export function ConnectivityBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
      <WifiOff className="h-3 w-3 shrink-0" />
      <span>Sin conexión. Los datos se muestran desde caché.</span>
    </div>
  );
}
