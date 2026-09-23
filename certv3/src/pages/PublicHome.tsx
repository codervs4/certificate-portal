import { FormEvent, useState } from 'react';
import {
  Search,
  Download,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

import {
  Button,
  Card,
  Input,
  Alert,
} from '../components/ui';

import { publicFindCertificate } from '../services/certificates';
import { getActiveTemplate } from '../services/templates';
import { generatePdf } from '../services/pdf';
import { recordDownload } from '../services/analytics';

import type {
  Certificate,
  CertificateTemplate,
} from '../types';

import { CertificatePreview } from '../components/CertificatePreview';

export default function PublicHome() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Certificate[]>([]);
  const [selected, setSelected] = useState<Certificate | null>(null);
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const search = async (e: FormEvent) => {
    e.preventDefault();

    setMsg('');
    setLoading(true);
    setSelected(null);
    setTemplate(null);

    try {
      const raw = await publicFindCertificate(q);

      // Make sure the result is always a Certificate[]
      const r: Certificate[] = raw ?? [];

      setResults(r);

      if (r.length === 1) {
        setSelected(r[0]);

        const activeTemplate = await getActiveTemplate();
        setTemplate(activeTemplate);
      }

      if (r.length === 0) {
        setMsg(
          'No certificate found. Check the certificate ID or exact recipient name.'
        );
      }
    } catch (e) {
      setMsg(
        e instanceof Error
          ? e.message
          : 'Search failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    if (!selected || !template) return;

    setLoading(true);
    setMsg('');

    try {
      await generatePdf(selected, template);
      await recordDownload(selected.id);
    } catch (e) {
      setMsg(
        e instanceof Error
          ? e.message
          : 'Download failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section className="noise-bg mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">

        <div className="max-w-2xl">

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#101722] px-3 py-1 text-xs font-semibold text-slate-400">
            <ShieldCheck size={14} />
            Official certificate verification
          </div>

          <h1 className="brand-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Find your certificate.
          </h1>

          <p className="mt-4 max-w-xl text-base leading-7 text-slate-400">
            Verify your participation in seconds. Search by certificate ID
            or exact name, preview the original certificate, and download
            a print-ready PDF.
          </p>

          <form
            onSubmit={search}
            className="mt-8 flex flex-col gap-2 sm:flex-row"
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Enter Certificate ID or name"
              aria-label="Certificate search"
            />

            <Button
              loading={loading}
              type="submit"
            >
              <Search size={17} />
              Find certificate
            </Button>
          </form>

          {msg && (
            <div className="mt-4">
              <Alert>{msg}</Alert>
            </div>
          )}

        </div>

        {results.length > 1 && (
          <div className="mt-8">
            <Card className="divide-y divide-white/10 overflow-hidden">

              {results.map((certificate) => (
                <button
                  key={certificate.id}
                  onClick={async () => {
                    setSelected(certificate);
                    setLoading(true);

                    try {
                      const activeTemplate =
                        await getActiveTemplate();

                      setTemplate(activeTemplate);
                    } catch (e) {
                      setMsg(
                        e instanceof Error
                          ? e.message
                          : 'Unable to load certificate template.'
                      );
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-[#080b12]"
                >
                  <div>
                    <div className="font-semibold">
                      {certificate.recipient_name}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {certificate.certificate_id}
                    </div>
                  </div>

                  <ArrowRight size={17} />
                </button>
              ))}

            </Card>
          </div>
        )}

        {selected && template && (
          <Card className="mt-10 overflow-hidden">

            <div className="border-b border-white/10 p-4 sm:p-5">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Certificate
                  </div>

                  <h2 className="mt-1 text-xl font-bold">
                    {selected.recipient_name}
                  </h2>

                  <p className="text-sm text-slate-400">
                    {selected.certificate_id}
                  </p>
                </div>

                <Button
                  loading={loading}
                  onClick={download}
                >
                  <Download size={17} />
                  Download PDF
                </Button>

              </div>

            </div>

            <div className="p-3 sm:p-5">
              <CertificatePreview
                certificate={selected}
                template={template}
              />
            </div>

          </Card>
        )}

        <div className="mt-10 grid gap-3 sm:grid-cols-3">

          <div className="rounded-xl border border-white/10 bg-[#0d131d]/90 p-4">
            <div className="text-sm font-semibold">
              Instant verification
            </div>

            <div className="mt-1 text-xs text-slate-400">
              No account required.
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0d131d]/90 p-4">
            <div className="text-sm font-semibold">
              Original design
            </div>

            <div className="mt-1 text-xs text-slate-400">
              Your certificate artwork stays unchanged.
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0d131d]/90 p-4">
            <div className="text-sm font-semibold">
              Print-ready PDF
            </div>

            <div className="mt-1 text-xs text-slate-400">
              Download whenever you need it.
            </div>
          </div>

        </div>

      </section>
    </main>
  );
}