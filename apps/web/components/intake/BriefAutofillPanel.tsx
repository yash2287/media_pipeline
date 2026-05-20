"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Mic, Sparkles, Square, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { parseBriefAction, type ParsedBrief } from "@/app/(operator)/projects/parse-brief";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const AUTOFILL_EVENT = "pipeline:autofill";

export function dispatchAutofill(parsed: ParsedBrief) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ParsedBrief>(AUTOFILL_EVENT, { detail: parsed }));
}

export const PIPELINE_AUTOFILL_EVENT = AUTOFILL_EVENT;

type RecordingState = "idle" | "recording" | "transcribing";

export function BriefAutofillPanel({ formId }: { formId: string }) {
  const [brief, setBrief] = useState("");
  const [pending, startTransition] = useTransition();
  const [recState, setRecState] = useState<RecordingState>("idle");
  const [recDurationSec, setRecDurationSec] = useState(0);
  const [lastApplied, setLastApplied] = useState<ParsedBrief | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        await transcribe(blob);
      };

      recorder.start();
      setRecState("recording");
      setRecDurationSec(0);
      timerRef.current = window.setInterval(() => setRecDurationSec((d) => d + 1), 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Microphone access denied: ${message}`);
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
  }

  async function transcribe(blob: Blob) {
    setRecState("transcribing");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "brief.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.error ?? `Transcribe failed: ${res.status}`);
      }
      const { text } = (await res.json()) as { text: string };
      setBrief((prev) => (prev ? `${prev}\n${text}` : text));
      toast.success("Transcribed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transcription failed.");
    } finally {
      setRecState("idle");
    }
  }

  function handleAutofill() {
    if (!brief.trim()) {
      toast.error("Type or record a brief first.");
      return;
    }
    startTransition(async () => {
      const result = await parseBriefAction({ brief });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      applyToForm(formId, result.parsed);
      dispatchAutofill(result.parsed);
      setLastApplied(result.parsed);
      toast.success("Wizard fields populated. Review and create.");
    });
  }

  const isRecording = recState === "recording";
  const isTranscribing = recState === "transcribing";

  return (
    <div className="panel-raise relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          background:
            "radial-gradient(420px 220px at 0% 0%, var(--accent-glow), transparent 60%)",
        }}
      />
      <div className="relative space-y-4 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow eyebrow-accent flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Concept autofill
            </div>
            <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.005em] text-[var(--ink)]">
              Brief the pipeline — type or talk
            </h2>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-5 text-[var(--ink-3)]">
              Describe the client, pack, mood, and copy in one shot. AI will populate every wizard tab below
              except photo uploads. You stay in control — review and edit before creating the project.
            </p>
          </div>
        </div>

        <Textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder={
            "Example: New project for Maya's Jewelry — a premium jewellery brand. Marketplace launch pack for Amazon, Etsy and Shopify. 20 hand-finished gold earring SKUs. Tone: confident, calm, knowing. Headline 'Made for hands that do.' CTA: Shop the drop. Lighting: window, marble surface, warm magazine grade. Budget cap 60 dollars, generate 3 variants per slot, watermark off."
          }
          className="min-h-32"
        />

        <div className="flex flex-wrap items-center gap-2">
          {!isRecording && !isTranscribing && (
            <Button type="button" variant="secondary" size="sm" onClick={startRecording}>
              <Mic className="h-3.5 w-3.5" />
              Record brief
            </Button>
          )}
          {isRecording && (
            <Button type="button" variant="danger" size="sm" onClick={stopRecording}>
              <Square className="h-3.5 w-3.5" />
              Stop · {formatSeconds(recDurationSec)}
            </Button>
          )}
          {isTranscribing && (
            <Button type="button" variant="secondary" size="sm" disabled>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Transcribing…
            </Button>
          )}

          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={handleAutofill}
            disabled={pending || !brief.trim()}
          >
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Parsing…
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" />
                Autofill wizard
              </>
            )}
          </Button>

          {brief && !pending && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setBrief("");
                setLastApplied(null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}

          {lastApplied && !pending && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--teal-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--teal)]">
              <CheckCircle2 className="h-3 w-3" />
              Fields applied — review below
            </span>
          )}
        </div>

        {lastApplied && (
          <div className="grid gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] p-3 text-[11.5px] leading-5 text-[var(--ink-3)] sm:grid-cols-2">
            {summarize(lastApplied).map(([label, value]) => (
              <div key={label} className="flex items-start gap-2">
                <span className="mono w-28 shrink-0 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {label}
                </span>
                <span className="min-w-0 text-[var(--ink-2)]">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function summarize(p: ParsedBrief): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (p.clientName) rows.push(["Client", p.clientName]);
  if (p.packType) rows.push(["Pack", p.packType]);
  if (p.targetMarketplaces?.length) rows.push(["Markets", p.targetMarketplaces.join(", ")]);
  if (p.hook) rows.push(["Hook", p.hook]);
  if (p.cta) rows.push(["CTA", p.cta]);
  if (p.tone) rows.push(["Tone", p.tone]);
  if (p.lighting) rows.push(["Lighting", p.lighting]);
  if (p.scene) rows.push(["Scene", p.scene]);
  if (p.colorGrade) rows.push(["Grade", p.colorGrade]);
  if (p.variantsPerSlot) rows.push(["Variants/slot", String(p.variantsPerSlot)]);
  if (p.carouselSlides) rows.push(["Carousel", `${p.carouselSlides} slides`]);
  if (p.budgetCapUsd != null) rows.push(["Budget", `$${p.budgetCapUsd}`]);
  if (p.brand?.name) rows.push(["Brand", p.brand.name]);
  if (p.brand?.industry) rows.push(["Industry", p.brand.industry]);
  if (p.notes) rows.push(["Notes", p.notes]);
  return rows;
}

// --- Imperative form population ----------------------------------------

function setField(form: HTMLFormElement, name: string, value: string | number | boolean | undefined) {
  if (value === undefined || value === null) return;
  const el = form.elements.namedItem(name);
  if (!el) return;

  if (el instanceof HTMLInputElement) {
    if (el.type === "checkbox") {
      el.checked = Boolean(value);
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (el.type === "number") {
      el.value = value === "" ? "" : String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      el.value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  } else if (el instanceof HTMLTextAreaElement) {
    el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else if (el instanceof HTMLSelectElement) {
    el.value = String(value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function applyToForm(formId: string, parsed: ParsedBrief) {
  const form = document.getElementById(formId);
  if (!(form instanceof HTMLFormElement)) return;

  setField(form, "clientName", parsed.clientName);
  setField(form, "clientEmail", parsed.clientEmail);
  setField(form, "dueAt", parsed.dueAt);

  setField(form, "campaignName", parsed.campaignName);
  setField(form, "season", parsed.season);
  setField(form, "hook", parsed.hook);
  setField(form, "cta", parsed.cta);
  setField(form, "valueProps", parsed.valueProps);
  setField(form, "targetAudience", parsed.targetAudience);
  setField(form, "tone", parsed.tone);

  setField(form, "lighting", parsed.lighting);
  setField(form, "scene", parsed.scene);
  setField(form, "framing", parsed.framing);
  setField(form, "colorGrade", parsed.colorGrade);

  setField(form, "carouselSlides", parsed.carouselSlides);
  setField(form, "carouselCopy", parsed.carouselCopy);
  setField(form, "variantsPerSlot", parsed.variantsPerSlot);

  setField(form, "skuTable", parsed.skuTable);

  setField(form, "budgetCapUsd", parsed.budgetCapUsd);
  setField(form, "smartCrop", parsed.smartCrop);
  setField(form, "companionExports", parsed.companionExports);
  setField(form, "captionAutoGen", parsed.captionAutoGen);
  setField(form, "watermark", parsed.watermark);
  setField(form, "generateListingCsv", parsed.generateListingCsv);

  if (parsed.brand) {
    setField(form, "brandName", parsed.brand.name);
    setField(form, "industry", parsed.brand.industry);
    setField(form, "styleKeywords", parsed.brand.styleKeywords);
    setField(form, "brandToneKeywords", parsed.brand.brandToneKeywords);
    setField(form, "colorPalette", parsed.brand.colorPalette);
    setField(form, "brandGuidelines", parsed.brand.brandGuidelines);
  }
}
