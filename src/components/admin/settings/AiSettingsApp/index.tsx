import {useEffect, useState} from "react";
import axios from "axios";

import {showToast} from "@/client/ToastUtils";
import {Button} from "@/components/ui/button";
import {Field, FieldDescription, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {
  AI_DEFAULT_BASE_URL,
  AI_DEFAULT_MODEL,
  AI_MAX_EXTRA_INSTRUCTIONS,
  type AiSettingsView,
} from "@/shared/AiSettings";
import {ADMIN_URLS} from "@/shared/StringUtils";
import SettingsBase from "../SettingsBase";

export const AI_SUBMIT_KEY = "ai-assistant";

function errorMessage(error: any): string {
  return error?.response?.data?.error ?? "Failed. Please try again.";
}

export default function AiSettingsApp() {
  const [saved, setSaved] = useState<AiSettingsView>();
  const [baseUrl, setBaseUrl] = useState(AI_DEFAULT_BASE_URL);
  const [model, setModel] = useState(AI_DEFAULT_MODEL);
  const [instructions, setInstructions] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const apply = (view: AiSettingsView) => {
    setSaved(view);
    setBaseUrl(view.baseUrl);
    setModel(view.model);
    setInstructions(view.extraInstructions);
    setApiKey("");
  };

  useEffect(() => {
    axios.get<AiSettingsView>(ADMIN_URLS.ajaxAiSettings())
      .then((response) => apply(response.data))
      .catch(() => setLoadError("Could not load AI settings. Refresh to try again."));
  }, []);

  const save = async (changes: Record<string, string>, message = "Updated!") => {
    setSaving(true);
    try {
      const response = await axios.patch<AiSettingsView>(ADMIN_URLS.ajaxAiSettings(), changes);
      apply(response.data);
      showToast(message, "success");
    } catch (error) {
      showToast(errorMessage(error), "error", 6000);
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || !saved;
  return (
    <SettingsBase
      currentType={AI_SUBMIT_KEY}
      description="Connect Ollama Cloud so the SEO / GEO section can draft a 120–140 character description from your post."
      submitForType={saving ? AI_SUBMIT_KEY : null}
      submitting={saving}
      title="AI assistant"
    >
      {loadError && <p role="alert" className="mb-4 text-sm text-destructive">{loadError}</p>}
      {saved && !saved.encryptionAvailable && <p role="alert" className="mb-4 text-sm text-destructive">
        This deployment has no encryption secret, so an API key cannot be stored safely.
      </p>}
      <div className="grid gap-5 md:grid-cols-2">
        <Field className="md:col-span-2">
          <FieldLabel htmlFor="ai-api-key">API key</FieldLabel>
          <Input id="ai-api-key" type="password" autoComplete="off" spellCheck={false}
            value={apiKey} disabled={disabled}
            placeholder={saved?.apiKeyConfigured ? `Saved (${saved.apiKeyHint}) — type to replace` : "Paste your Ollama API key"}
            onChange={(event) => setApiKey(event.target.value)} />
          <FieldDescription className="text-xs">
            Create one at ollama.com/settings/keys. It is encrypted before it is stored and is never shown again
            or sent back to your browser.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="ai-base-url">Address</FieldLabel>
          <Input id="ai-base-url" type="url" value={baseUrl} disabled={disabled}
            onChange={(event) => setBaseUrl(event.target.value)} />
          <FieldDescription className="text-xs">Leave as {AI_DEFAULT_BASE_URL} for Ollama Cloud. Changing it requires re-entering the key.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="ai-model">Model</FieldLabel>
          <Input id="ai-model" value={model} disabled={disabled}
            onChange={(event) => setModel(event.target.value)} />
          <FieldDescription className="text-xs">Use the exact name from ollama.com/api/tags.</FieldDescription>
        </Field>
        <Field className="md:col-span-2">
          <FieldLabel htmlFor="ai-instructions">Extra instructions (optional)</FieldLabel>
          <Textarea id="ai-instructions" rows={3} value={instructions} disabled={disabled}
            maxLength={AI_MAX_EXTRA_INSTRUCTIONS}
            placeholder="For example: first person, calm tone, avoid jargon."
            onChange={(event) => setInstructions(event.target.value)} />
        </Field>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="button" disabled={disabled} onClick={() => save({
          baseUrl, model, extraInstructions: instructions,
          ...(apiKey ? {apiKey} : {}),
        })}>{saving ? "Updating..." : "Update"}</Button>
        {saved?.apiKeyConfigured && <Button type="button" variant="outline" disabled={disabled}
          onClick={() => save({apiKey: ""}, "API key removed.")}>Remove key</Button>}
      </div>
    </SettingsBase>
  );
}
