import { Component } from "solid-js";
import UserDropdownMenu from "@components/UserDropdownMenu";
import { useTheme } from "~/context/ThemeContext";

const Navbar: Component = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav class="futuristic-navbar fixed top-0 z-50 w-full">
      <div class="px-4 py-3 lg:px-6">
        <div class="flex items-center justify-between">
          {/* Left: Hamburger (mobile) + Breadcrumb */}
          <div class="flex items-center justify-start">
            <button
              data-drawer-target="sidebar-default"
              data-drawer-toggle="sidebar-default"
              aria-controls="sidebar-default"
              type="button"
              class="inline-flex items-center p-2 text-gray-400 rounded-lg sm:hidden hover:bg-white/10 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            >
              <span class="sr-only">Open sidebar</span>
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            <a href="/" class="hidden sm:flex items-center ml-2 gap-2">
              <span class="text-sm font-bold gradient-text">APF</span>
              <span class="text-gray-600">/</span>
              <span class="text-sm text-gray-400">Agentic Persona Factory</span>
            </a>
          </div>

          {/* Center: Search */}
          <div class="hidden md:flex flex-1 max-w-md mx-8">
            <div class="relative w-full">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <input
                type="text"
                class="block w-full pl-10 pr-4 py-2 text-sm text-gray-200 bg-white/5 border border-white/10 rounded-xl focus:ring-neon-cyan/50 focus:border-neon-cyan/50 placeholder-gray-500 transition-all"
                placeholder="Search agents, rooms, files… (⌘K)"
              />
              <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                <kbd class="px-1.5 py-0.5 text-xs text-gray-500 bg-white/5 border border-white/10 rounded">⌘K</kbd>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div class="flex items-center space-x-3">
            {/* Mobile Search */}
            <button class="md:hidden p-2 text-gray-400 rounded-lg hover:bg-white/10 hover:text-gray-200 transition-all">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>

            {/* Notifications */}
            <button
              type="button"
              data-dropdown-toggle="notification-dropdown"
              class="relative p-2 text-gray-400 rounded-lg hover:bg-white/10 hover:text-gray-200 transition-all"
            >
              <span class="sr-only">Notifications</span>
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span class="absolute top-1 right-1 w-2.5 h-2.5 bg-neon-rose rounded-full pulse-dot border-2 border-dark-900" />
            </button>

            {/* Notifications Dropdown */}
            <div class="z-50 hidden w-80 bg-dark-800 border border-white/10 rounded-xl shadow-2xl" id="notification-dropdown">
              <div class="p-4 border-b border-white/10 flex items-center justify-between">
                <h6 class="text-sm font-semibold text-gray-200">Notifications</h6>
                <span class="inline-flex items-center px-2 py-0.5 text-xs font-medium text-neon-cyan bg-neon-cyan/10 rounded-full">2 new</span>
              </div>
              <div class="divide-y divide-white/5">
                <a href="#" class="flex items-center px-4 py-3 hover:bg-white/5 transition-colors">
                  <div class="w-8 h-8 rounded-full bg-neon-emerald/20 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4 text-neon-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm text-gray-200">SEO Specialist <span class="font-medium text-neon-emerald">completed task</span></p>
                    <p class="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </a>
                <a href="#" class="flex items-center px-4 py-3 hover:bg-white/5 transition-colors">
                  <div class="w-8 h-8 rounded-full bg-neon-violet/20 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4 text-neon-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3a48.527 48.527 0 01-4.02-.163 2.115 2.115 0 01-.825-.242" />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm text-gray-200">New <span class="font-medium text-neon-violet">War Room session</span> started</p>
                    <p class="text-xs text-gray-500">15 minutes ago</p>
                  </div>
                </a>
              </div>
              <div class="p-3 border-t border-white/10">
                <a href="#" class="block text-center text-sm text-neon-cyan hover:underline">View all notifications</a>
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              class="p-2 text-gray-400 rounded-lg hover:bg-white/10 hover:text-neon-amber transition-all"
              aria-label="Toggle theme"
            >
              {theme() === "dark" ? (
                <svg class="w-5 h-5 text-neon-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg class="w-5 h-5 text-neon-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>

            <div class="hidden md:block w-px h-6 bg-white/10" />

            {/* User Avatar */}
            <button
              type="button"
              class="flex items-center text-sm rounded-full focus:ring-2 focus:ring-neon-cyan/30 transition-all"
              id="user-menu-button"
              data-dropdown-toggle="user-dropdown"
              data-dropdown-placement="bottom-end"
            >
              <span class="sr-only">User menu</span>
              <img
                class="w-8 h-8 rounded-full ring-2 ring-white/10 hover:ring-neon-cyan/30 transition-all"
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=APFUser"
                alt="User"
              />
            </button>

            <UserDropdownMenu />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
