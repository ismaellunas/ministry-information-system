"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Church } from "@/domain/types";
import { formatPhoneInput, toProperCase } from "@/domain/directory";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { Textarea } from "@/core/ui/textarea";
import { AutosaveForm, SAVE_DEBOUNCE_MS } from "@/core/ui/autosave";
import {
  closeChurchAction,
  createChurchAction,
  renameChurchAction,
  updateDirectoryAction,
  uploadLogoAction,
} from "@/app/(app)/churches/actions";

export function CreateChurchForm() {
  const router = useRouter();
  const lastSubmit = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    const now = Date.now();
    if (pending || now - lastSubmit.current < SAVE_DEBOUNCE_MS) return;
    lastSubmit.current = now;
    setError(null);
    setPending(true);
    const result = await createChurchAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/churches/${result.data.id}`);
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="name">Church name</Label>
        <Input id="name" name="name" required />
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Done"}
      </Button>
    </form>
  );
}

export function DirectoryForm({ church, canClose }: { church: Church; canClose: boolean }) {
  const router = useRouter();
  const savedName = useRef(church.name);
  const savedDirectory = useRef(directorySignature(church));
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {canClose && (
        <AutosaveForm
          className="space-y-3"
          save={async (formData) => {
            const name = String(formData.get("name") ?? "").trim();
            if (name === savedName.current) return false;
            const result = await renameChurchAction(formData);
            if (!result.ok) return result.error;
            savedName.current = name;
            router.refresh();
            return null;
          }}
        >
          <input type="hidden" name="church_id" value={church.id} />
          <div className="space-y-1">
            <Label htmlFor="name">Church name</Label>
            <Input id="name" name="name" defaultValue={church.name} required />
          </div>
        </AutosaveForm>
      )}

      <AutosaveForm
        className="space-y-3"
        save={async (formData) => {
          const next = directorySignatureFromForm(formData);
          if (next === savedDirectory.current) return false;
          const result = await updateDirectoryAction(formData);
          if (!result.ok) return result.error;
          savedDirectory.current = next;
          return null;
        }}
      >
        <input type="hidden" name="church_id" value={church.id} />
        <NameField
          id="pastor_first_name"
          label="Pastor first name"
          defaultValue={church.pastorFirstName}
        />
        <NameField
          id="pastor_last_name"
          label="Pastor last name"
          defaultValue={church.pastorLastName}
        />
        <PhoneField
          id="pastor_phone"
          label="Pastor phone"
          defaultValue={church.pastorPhone}
        />
        <PhoneField
          id="hotline_number"
          label="Hotline"
          defaultValue={church.hotlineNumber}
        />
        <div className="space-y-1">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            name="address"
            defaultValue={church.address ?? ""}
            rows={4}
            autoComplete="street-address"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="facebook_page_url">Facebook page</Label>
          <Input
            id="facebook_page_url"
            name="facebook_page_url"
            type="url"
            inputMode="url"
            defaultValue={church.facebookPageUrl ?? ""}
            placeholder="https://www.facebook.com/yourpage"
          />
          <p className="page-copy">Use the church Facebook page link, not a personal profile share.</p>
        </div>
        <MapPinField defaultValue={church.mapPinUrl} address={church.address} />
      </AutosaveForm>

      <AutosaveForm
        className="space-y-3"
        save={async (formData) => {
          const file = formData.get("logo");
          if (!(file instanceof File) || file.size === 0) return false;
          const result = await uploadLogoAction(formData);
          if (!result.ok) return result.error;
          router.refresh();
          return null;
        }}
      >
        <input type="hidden" name="church_id" value={church.id} />
        <div className="space-y-1">
          <Label htmlFor="logo">Logo (WebP, PNG, or JPEG, 200 KB max)</Label>
          <Input id="logo" name="logo" type="file" accept="image/webp,image/png,image/jpeg" />
        </div>
      </AutosaveForm>

      {canClose && church.isActive && (
        <form
          action={async (formData) => {
            if (!window.confirm("Close this church? It stays listed but cannot receive new events or logins.")) return;
            setError(null);
            const result = await closeChurchAction(formData);
            if (!result.ok) setError(result.error);
            else router.refresh();
          }}
        >
          <input type="hidden" name="church_id" value={church.id} />
          <Button type="submit" variant="destructive" className="w-full">Close church</Button>
        </form>
      )}

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function directorySignature(church: Church) {
  return [
    church.pastorFirstName ?? "",
    church.pastorLastName ?? "",
    church.pastorPhone ?? "",
    church.hotlineNumber ?? "",
    church.address ?? "",
    church.facebookPageUrl ?? "",
    church.mapPinUrl ?? "",
  ].join("\n");
}

function directorySignatureFromForm(formData: FormData) {
  return ["pastor_first_name", "pastor_last_name", "pastor_phone", "hotline_number", "address", "facebook_page_url", "map_pin_url"]
    .map((name) => String(formData.get(name) ?? ""))
    .join("\n");
}

function NameField({
  id,
  label,
  defaultValue,
}: {
  id: string;
  label: string;
  defaultValue: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        value={value}
        autoComplete="off"
        autoCapitalize="words"
        onChange={(event) => setValue(event.target.value)}
        onBlur={(event) => {
          const next = event.target.value.trim()
            ? toProperCase(event.target.value)
            : event.target.value;
          event.target.value = next;
          setValue(next);
        }}
      />
    </div>
  );
}

function PhoneField({
  id,
  label,
  defaultValue,
}: {
  id: string;
  label: string;
  defaultValue: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="(0917) 1234 567"
        value={value}
        onChange={(event) => setValue(formatPhoneInput(event.target.value))}
      />
    </div>
  );
}

function MapPinField({
  defaultValue,
  address,
}: {
  defaultValue: string | null;
  address: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);
  const mapsUrl = useMemo(() => {
    const query = address?.trim();
    if (query) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
    return "https://www.google.com/maps";
  }, [address]);

  return (
    <div className="space-y-2">
      <Label htmlFor="map_pin_url">Map pin</Label>
      <p className="page-copy">
        Open Google Maps, drop a pin, then paste the share link. Saving stores that pin.
      </p>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs"
      >
        Open Google Maps
      </a>
      <Input
        id="map_pin_url"
        name="map_pin_url"
        type="url"
        inputMode="url"
        placeholder="https://maps.app.goo.gl/…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
}
