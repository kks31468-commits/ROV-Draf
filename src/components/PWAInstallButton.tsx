import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, X, Check, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed and opened in standalone mode, show clean badge
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
        <Check className="w-3.5 h-3.5" />
        <span>ติดตั้งแล้ว (App Mode)</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 3000);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General instructions for other browsers
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-heading font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
        title="ติดตั้งแอพ RoV Drafter ลงบนหน้าจอมือถือของคุณ"
      >
        <Download className="w-3.5 h-3.5" />
        <span>ติดตั้งแอพลงมือถือ</span>
      </button>

      {/* iOS / General Install Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-slate-200">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-950 border border-amber-500/50 flex items-center justify-center p-1.5 shadow-lg">
                <img src="/icon.svg" alt="App Icon" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">ติดตั้ง RoV Meta Drafter</h3>
                <p className="text-xs text-amber-400 font-semibold">ลงบนหน้าจอมือถือของคุณ</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400 shrink-0 mt-0.5">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-white">1. กดปุ่มแชร์ (Share)</strong>
                  <p className="text-slate-400 mt-0.5">
                    แตะที่ไอคอนแชร์ที่แถบล่างของ Safari หรือจุด 3 จุดบน Chrome
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400 shrink-0 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-white">2. เลือก "เพิ่มไปยังหน้าจอโฮม"</strong>
                  <p className="text-slate-400 mt-0.5">
                    (Add to Home Screen) เลื่อนลงมาในเมนู
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400 shrink-0 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-white">3. แตะ "เพิ่ม" (Add)</strong>
                  <p className="text-slate-400 mt-0.5">
                    แอพจะไปอยู่ที่หน้าจอมือถือของคุณทันที เปิดใช้งานเต็มจอเร็วสะใจ!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-white transition-colors"
            >
              เข้าใจแล้ว ปิดหน้าต่างนี้
            </button>
          </div>
        </div>
      )}
    </>
  );
};
