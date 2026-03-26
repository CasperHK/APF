import { Component } from "solid-js";
import Button from "@components/ui/Button";

interface ConfirmLogoutDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmLogoutDialog: Component<ConfirmLogoutDialogProps> = (props) => {
  return (
    <div class="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={props.onCancel}
      />

      {/* Modal */}
      <div class="relative glass-card-strong p-6 w-full max-w-sm mx-4 glow-rose">
        <div class="flex items-center gap-3 mb-4">
          <div class="p-2 rounded-xl bg-neon-rose/10">
            <svg class="w-5 h-5 text-neon-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-white">Sign out?</h3>
            <p class="text-xs text-gray-400">Your session will be terminated.</p>
          </div>
        </div>

        <div class="flex gap-3">
          <Button variant="secondary" fullWidth onClick={props.onCancel}>
            Cancel
          </Button>
          <Button variant="danger" fullWidth onClick={props.onConfirm}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmLogoutDialog;
