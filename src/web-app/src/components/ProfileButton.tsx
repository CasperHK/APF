import { Component } from "solid-js";

interface ProfileButtonProps {
  userName?: string;
  email?: string;
  avatarSeed?: string;
}

const ProfileButton: Component<ProfileButtonProps> = (props) => {
  const userName = () => props.userName ?? "APF User";
  const email = () => props.email ?? "user@apf.ai";
  const avatarSeed = () => props.avatarSeed ?? "APFUser";

  return (
    <a
      href="/settings"
      class="group mt-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/50 transition-all duration-200 flex items-center"
      aria-label="Go to settings"
    >
      <img
        class="w-9 h-9 rounded-full ring-2 ring-neon-cyan/30"
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed()}`}
        alt={userName()}
      />
      <div class="ml-3 min-w-0">
        <p class="text-sm font-medium text-gray-200 truncate">{userName()}</p>
        <p class="text-xs text-gray-500 truncate">{email()}</p>
      </div>
      <span class="ml-auto text-gray-500 group-hover:text-gray-300 transition-colors" aria-hidden="true">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </span>
    </a>
  );
};

export default ProfileButton;
