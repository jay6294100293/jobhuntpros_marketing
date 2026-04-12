import React, { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const BetaAgreementModal = ({ onAccepted }) => {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await onAccepted();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-white shrink-0" />
            <h2 className="text-lg font-semibold text-white">SwiftPack AI Beta Testing Agreement</h2>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 text-sm text-zinc-300 leading-relaxed">
          <p>Before you continue, please read and accept the following terms:</p>

          <ul className="space-y-3 list-none">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold mt-0.5">1.</span>
              <span>This software is provided <strong className="text-zinc-100">as-is</strong> for beta testing purposes only. It is not production software.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold mt-0.5">2.</span>
              <span><strong className="text-zinc-100">NovaJay Tech (FM1032559)</strong> accepts no liability for any losses, damages, or issues arising from your use of this software.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold mt-0.5">3.</span>
              <span>You will <strong className="text-zinc-100">not use this software for commercial purposes</strong> during the beta period.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold mt-0.5">4.</span>
              <span>Features may change, be removed, or stop working without notice.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold mt-0.5">5.</span>
              <span>You are a <strong className="text-zinc-100">voluntary beta tester</strong> and understand the software may have bugs.</span>
            </li>
          </ul>

          <p className="text-zinc-400 text-xs pt-2 border-t border-zinc-800">
            By clicking Accept you confirm you have read and agree to these terms. Your acceptance will be recorded.
          </p>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            I Accept — Continue to SwiftPack AI
          </button>
        </div>
      </div>
    </div>
  );
};
