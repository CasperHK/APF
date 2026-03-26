import { Title } from "@solidjs/meta";
import { Component, createSignal } from "solid-js";
import DashboardLayout from "@layouts/DashboardLayout";
import Card from "@components/ui/Card";
import Button from "@components/ui/Button";
import Input from "@components/ui/Input";

const Settings: Component = () => {
  const [apiUrl, setApiUrl] = createSignal("/api");
  const [wsUrl, setWsUrl] = createSignal("");
  const [anthropicKey, setAnthropicKey] = createSignal("");
  const [deepseekKey, setDeepseekKey] = createSignal("");
  const [saved, setSaved] = createSignal(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout>
      <Title>Settings — APF</Title>

      <div class="mb-6">
        <h1 class="text-2xl font-bold text-white mb-1">⚙️ Settings</h1>
        <p class="text-sm text-gray-400">Configure API endpoints, models, and account preferences</p>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-4xl">
        {/* API Configuration */}
        <Card title="API Configuration" subtitle="Single-container Elysia endpoint">
          <div class="space-y-4 mt-2">
            <Input
              label="API Base URL"
              value={apiUrl()}
              onInput={(e) => setApiUrl(e.currentTarget.value)}
              placeholder="/api (same-origin)"
            />
            <Input
              label="WebSocket URL (optional)"
              value={wsUrl()}
              onInput={(e) => setWsUrl(e.currentTarget.value)}
              placeholder="Auto-derived from origin"
            />
            <div class="p-3 rounded-xl bg-neon-cyan/5 border border-neon-cyan/20">
              <p class="text-xs text-gray-400">
                <span class="text-neon-cyan font-medium">Single Container Mode</span> — The Elysia API server and
                SolidStart SSR run in the same Bun process. No CORS or separate ports needed.
              </p>
            </div>
          </div>
        </Card>

        {/* LLM Keys */}
        <Card title="LLM API Keys" subtitle="Used by agent-worker container">
          <div class="space-y-4 mt-2">
            <Input
              label="Anthropic API Key"
              type="password"
              value={anthropicKey()}
              onInput={(e) => setAnthropicKey(e.currentTarget.value)}
              placeholder="sk-ant-…"
            />
            <Input
              label="DeepSeek API Key"
              type="password"
              value={deepseekKey()}
              onInput={(e) => setDeepseekKey(e.currentTarget.value)}
              placeholder="sk-…"
            />
            <p class="text-xs text-gray-500">Keys are stored in environment variables, never committed to source.</p>
          </div>
        </Card>

        {/* Model Preferences */}
        <Card title="Default Models" subtitle="Fallback model per agent role">
          <div class="space-y-3 mt-2">
            {[
              { role: "Copywriting",  model: "claude-opus-4.6"    },
              { role: "Strategy",     model: "deepseek-v3"         },
              { role: "SEO / Data",   model: "claude-3.5-sonnet"  },
              { role: "Fast Tasks",   model: "claude-haiku-4.5"   },
            ].map(({ role, model }) => (
              <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                <span class="text-sm text-gray-300">{role}</span>
                <span class="text-xs font-mono text-neon-cyan">{model}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Danger Zone */}
        <Card title="Danger Zone" glow="rose">
          <div class="space-y-3 mt-2">
            <div class="flex items-center justify-between p-3 rounded-xl bg-neon-rose/5 border border-neon-rose/20">
              <div>
                <p class="text-sm font-medium text-white">Clear Workspace</p>
                <p class="text-xs text-gray-400">Delete all files in /secure_workspace</p>
              </div>
              <Button variant="danger" size="sm">Clear</Button>
            </div>
            <div class="flex items-center justify-between p-3 rounded-xl bg-neon-rose/5 border border-neon-rose/20">
              <div>
                <p class="text-sm font-medium text-white">Reset All Agents</p>
                <p class="text-xs text-gray-400">Remove all custom agents from the store</p>
              </div>
              <Button variant="danger" size="sm">Reset</Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Save Bar */}
      <div class="mt-6 flex items-center gap-3 max-w-4xl">
        <Button onClick={save} fullWidth={false}>
          {saved() ? "✓ Saved!" : "Save Configuration"}
        </Button>
        <Button variant="secondary">
          Reset to Defaults
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
