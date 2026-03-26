import { useLocation } from "@solidjs/router";
import { Component, createSignal, For } from "solid-js";
import ProfileButton from "@components/ProfileButton";

interface NavItem {
  label: string;
  icon: string;
  href?: string;
  badge?: string;
  children?: { label: string; href: string }[];
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard",    icon: "dashboard",    href: "/"           },
  { label: "Marketplace",  icon: "marketplace",  href: "/marketplace" },
  { label: "War Room",     icon: "war-room",     href: "/war-room",  badge: "Live" },
  { label: "Workspace",    icon: "workspace",    href: "/workspace"  },
];

const secondaryNavItems: NavItem[] = [
  { label: "Settings",     icon: "settings",     href: "/settings"  },
  { label: "Help & Docs",  icon: "help",         href: "#"          },
];

function getIcon(name: string) {
  const cls = "w-5 h-5";
  switch (name) {
    case "dashboard":
      return (
        <svg class={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
        </svg>
      );
    case "marketplace":
      return (
        <svg class={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
        </svg>
      );
    case "war-room":
      return (
        <svg class={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      );
    case "workspace":
      return (
        <svg class={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      );
    case "settings":
      return (
        <svg class={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "help":
      return (
        <svg class={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      );
    default:
      return null;
  }
}

const Sidebar: Component = () => {
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = createSignal<string | null>(null);

  const isActive = (href?: string) => {
    if (!href || href === "#") return false;
    if (href === "/") return location.pathname === "/";
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const toggleDropdown = (label: string) =>
    setOpenDropdown(openDropdown() === label ? null : label);

  return (
    <aside
      id="sidebar-default"
      class="futuristic-sidebar fixed top-0 left-0 z-40 w-64 h-screen pt-16 transition-transform -translate-x-full sm:translate-x-0"
    >
      <div class="h-full px-3 py-6 overflow-y-auto flex flex-col">
        {/* Brand */}
        <a href="/" class="flex items-center px-3 mb-8">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center mr-3 shrink-0">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
          </div>
          <div>
            <span class="text-base font-bold gradient-text">APF</span>
            <p class="text-xs text-gray-500 leading-none">Agentic Persona Factory</p>
          </div>
        </a>

        {/* Main nav */}
        <nav class="flex-1 space-y-1">
          <p class="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Main Menu</p>
          <For each={mainNavItems}>
            {(item) => (
              <div>
                {item.children ? (
                  <>
                    <button
                      type="button"
                      class={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${openDropdown() === item.label ? "text-neon-cyan bg-white/5" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"}`}
                      onClick={() => toggleDropdown(item.label)}
                    >
                      <span class="shrink-0 transition-colors duration-200 group-hover:text-neon-cyan">{getIcon(item.icon)}</span>
                      <span class="flex-1 ms-3 text-left whitespace-nowrap">{item.label}</span>
                      <svg class={`w-4 h-4 transition-transform duration-200 ${openDropdown() === item.label ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    <ul class={`overflow-hidden transition-all duration-300 ${openDropdown() === item.label ? "max-h-48 opacity-100 mt-1" : "max-h-0 opacity-0"}`}>
                      <For each={item.children}>
                        {(child) => (
                          <li>
                            <a href={child.href} class="flex items-center pl-11 pr-3 py-2 text-sm text-gray-400 rounded-lg hover:text-neon-cyan hover:bg-white/5 transition-all duration-200">
                              {child.label}
                            </a>
                          </li>
                        )}
                      </For>
                    </ul>
                  </>
                ) : (
                  <a
                    href={item.href}
                    class={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${isActive(item.href) ? "nav-item-active text-neon-cyan" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"}`}
                  >
                    <span class={`shrink-0 transition-colors duration-200 ${isActive(item.href) ? "text-neon-cyan" : "group-hover:text-neon-cyan"}`}>
                      {getIcon(item.icon)}
                    </span>
                    <span class="flex-1 ms-3 whitespace-nowrap">{item.label}</span>
                    {item.badge && (
                      <span class="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-neon-cyan bg-neon-cyan/10 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </a>
                )}
              </div>
            )}
          </For>
        </nav>

        {/* Separator */}
        <div class="border-t border-white/10 my-4" />

        {/* Secondary nav */}
        <nav class="space-y-1 mb-4">
          <p class="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Support</p>
          <For each={secondaryNavItems}>
            {(item) => (
              <a
                href={item.href}
                class={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${isActive(item.href) ? "nav-item-active text-neon-cyan" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"}`}
              >
                <span class={`shrink-0 transition-colors duration-200 ${isActive(item.href) ? "text-neon-cyan" : "group-hover:text-neon-cyan"}`}>
                  {getIcon(item.icon)}
                </span>
                <span class="flex-1 ms-3 whitespace-nowrap">{item.label}</span>
              </a>
            )}
          </For>
        </nav>

        {/* Upgrade CTA */}
        <div class="p-4 rounded-xl bg-gradient-to-br from-neon-cyan/10 to-neon-violet/10 border border-neon-cyan/20">
          <div class="flex items-center mb-3">
            <span class="inline-flex items-center px-2 py-0.5 text-xs font-semibold text-neon-cyan bg-neon-cyan/10 rounded-full">PRO</span>
          </div>
          <p class="text-sm text-gray-300 mb-3">Unlock unlimited agents, Claude Opus & priority queuing.</p>
          <button class="w-full px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-neon-cyan to-neon-violet rounded-lg hover:opacity-90 transition-opacity">
            Upgrade Now
          </button>
        </div>

        <ProfileButton />
      </div>
    </aside>
  );
};

export default Sidebar;
