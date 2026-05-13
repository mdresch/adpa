'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from '@/components/ui/icons-shim';
import { toast } from '@/lib/notify';
import type {
  WordBulkExportBranding,
  WordBulkExportLayout,
  WordBulkExportMode,
  WordBulkExportDialogValues,
  WordCoverTemplate,
} from '@/lib/documents/word-export';

export type { WordBulkExportDialogValues };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  defaultCompanyName?: string;
  onExport: (values: WordBulkExportDialogValues) => Promise<void>;
  exporting: boolean;
};

const DEFAULT_PRIMARY = '#2563eb';
const DEFAULT_SECONDARY = '#64748b';

const LOGO_MIME = /^image\/(png|jpeg|jpg|gif)$/i;

export function ExportWordDialog({
  open,
  onOpenChange,
  selectedCount,
  defaultCompanyName = '',
  onExport,
  exporting,
}: Props) {
  const [mode, setMode] = React.useState<WordBulkExportMode>('combined');
  const [companyName, setCompanyName] = React.useState('');
  const [tagline, setTagline] = React.useState('');
  const [documentSeparator, setDocumentSeparator] = React.useState<
    NonNullable<WordBulkExportLayout['documentSeparator']>
  >('horizontal_rule');
  const [bodyFontPt, setBodyFontPt] = React.useState<'12' | '11'>('12');
  const [coverTemplate, setCoverTemplate] = React.useState<WordCoverTemplate>('minimal');
  const [primaryColor, setPrimaryColor] = React.useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = React.useState(DEFAULT_SECONDARY);
  const [includeTableOfContents, setIncludeTableOfContents] = React.useState(true);
  const [logoDataUrl, setLogoDataUrl] = React.useState<string | undefined>(undefined);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setCompanyName(defaultCompanyName);
      setTagline('');
      setMode('combined');
      setDocumentSeparator('horizontal_rule');
      setBodyFontPt('12');
      setCoverTemplate('minimal');
      setPrimaryColor(DEFAULT_PRIMARY);
      setSecondaryColor(DEFAULT_SECONDARY);
      setIncludeTableOfContents(true);
      setLogoDataUrl(undefined);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }, [open, defaultCompanyName]);

  const onLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setLogoDataUrl(undefined);
      return;
    }
    if (!LOGO_MIME.test(file.type)) {
      setLogoDataUrl(undefined);
      e.target.value = '';
      toast.error('Logo must be a PNG, JPEG, or GIF image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoDataUrl(undefined);
      e.target.value = '';
      toast.error('Logo must be 2 MB or smaller');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === 'string') setLogoDataUrl(r);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const branding: WordBulkExportBranding = {
      ...(companyName.trim() ? { companyName: companyName.trim() } : {}),
      ...(tagline.trim() ? { tagline: tagline.trim() } : {}),
      ...(logoDataUrl ? { logoDataUrl } : {}),
    };
    const layout: WordBulkExportLayout = {
      documentSeparator: mode === 'combined' ? documentSeparator : undefined,
      bodyFontPt: bodyFontPt === '11' ? 11 : 12,
      coverTemplate,
      primaryColor: primaryColor,
      secondaryColor: secondaryColor,
      includeTableOfContents,
    };
    await onExport({
      mode,
      branding: Object.keys(branding).length ? branding : undefined,
      layout,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col overflow-y-auto sm:max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-0">
          <DialogHeader>
            <DialogTitle>Export to Word</DialogTitle>
            <DialogDescription>
              Configure how {selectedCount} selected document{selectedCount === 1 ? '' : 's'} will be exported
              to Microsoft Word (.docx). Cover, colors, and an optional table of contents apply to each generated file.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Output</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as WordBulkExportMode)}
                className="grid gap-2"
              >
                <label
                  htmlFor="mode-combined"
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary"
                >
                  <RadioGroupItem value="combined" id="mode-combined" className="mt-0.5" />
                  <div>
                    <div className="font-medium leading-none">One combined document</div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      All selected documents merged into a single .docx file.
                    </p>
                  </div>
                </label>
                <label
                  htmlFor="mode-zip"
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary"
                >
                  <RadioGroupItem value="per_document_zip" id="mode-zip" className="mt-0.5" />
                  <div>
                    <div className="font-medium leading-none">One file per document (ZIP)</div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Each document becomes its own .docx; files are packaged in a .zip download.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="export-company">Branding — organization name</Label>
              <Input
                id="export-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme PMO"
                maxLength={200}
              />
              <p className="text-muted-foreground text-xs">
                Used on the cover and in metadata. Defaults from the project name when you open this dialog.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="export-tagline">Branding — tagline (optional)</Label>
              <Input
                id="export-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Short subtitle on the cover"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="export-logo">Branding — logo (optional)</Label>
              <Input
                id="export-logo"
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                onChange={onLogoFile}
                className="cursor-pointer"
              />
              <p className="text-muted-foreground text-xs">PNG, JPEG, or GIF, up to 2 MB.</p>
              {logoDataUrl ? (
                <div className="flex items-center gap-3 pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoDataUrl} alt="" className="h-16 w-16 rounded border object-contain" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                    setLogoDataUrl(undefined);
                    if (logoInputRef.current) logoInputRef.current.value = '';
                  }}>
                    Remove logo
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="export-primary">Primary color</Label>
                <div className="flex gap-2">
                  <Input
                    id="export-primary"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#2563eb"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="export-secondary">Secondary color</Label>
                <div className="flex gap-2">
                  <Input
                    id="export-secondary"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#64748b"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cover page template</Label>
              <Select value={coverTemplate} onValueChange={(v) => setCoverTemplate(v as WordCoverTemplate)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal — centered title and accent rule</SelectItem>
                  <SelectItem value="corporate">Corporate — brand bar and structured block</SelectItem>
                  <SelectItem value="bold">Bold — thick left accent and strong title</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                id="export-toc"
                checked={includeTableOfContents}
                onCheckedChange={(c) => setIncludeTableOfContents(c === true)}
              />
              <div className="grid gap-1 leading-snug">
                <Label htmlFor="export-toc" className="cursor-pointer font-medium">
                  Table of contents after the cover
                </Label>
                <p className="text-muted-foreground text-sm">
                  Inserts a Word TOC field (headings levels 1–4). After opening the file, use Update Table or update
                  fields so page numbers and entries fill in.
                </p>
              </div>
            </div>

            {mode === 'combined' && (
              <div className="space-y-2">
                <Label>Layout — between documents</Label>
                <RadioGroup
                  value={documentSeparator}
                  onValueChange={(v) =>
                    setDocumentSeparator(v as NonNullable<WordBulkExportLayout['documentSeparator']>)
                  }
                  className="grid gap-2"
                >
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <RadioGroupItem value="horizontal_rule" id="sep-hr" />
                    Horizontal rule (default)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <RadioGroupItem value="page_break" id="sep-pb" />
                    Page break before each document (after the first)
                  </label>
                </RadioGroup>
              </div>
            )}

            <div className="space-y-2">
              <Label>Layout — body text size</Label>
              <Select value={bodyFontPt} onValueChange={(v) => setBodyFontPt(v as '11' | '12')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 pt (default)</SelectItem>
                  <SelectItem value="11">11 pt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
              Cancel
            </Button>
            <Button type="submit" disabled={exporting}>
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting…
                </>
              ) : (
                'Export'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
