import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  CertificateTemplate,
  TemplatePosition,
} from '../types';

import { Button, Input } from './ui';

const fonts = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'Courier New',
  'Garamond',
  'Tahoma',
];

function getPosition(template: CertificateTemplate): TemplatePosition {
  return {
    x: template.name_x,
    y: template.name_y,
    width: template.name_width,
    height: template.name_height,
    fontFamily: template.font_family,
    fontSize: template.font_size,
    fontWeight: template.font_weight,
    alignment: template.text_alignment,
    color: template.text_color,
    letterSpacing: template.letter_spacing,
    lineHeight: template.line_height,
    allowMultiline: template.allow_multiline,
    minFontSize: template.min_font_size,
  };
}

export function TemplateEditor({
  template,
  onSave,
}: {
  template: CertificateTemplate;
  onSave: (p: TemplatePosition) => Promise<void>;
}) {
  const box = useRef<HTMLDivElement>(null);

  const [p, setP] = useState<TemplatePosition>(
    getPosition(template)
  );

  const [drag, setDrag] = useState<{
    sx: number;
    sy: number;
    x: number;
    y: number;
  } | null>(null);

  const [resize, setResize] = useState<{
    sx: number;
    sy: number;
    w: number;
    h: number;
  } | null>(null);

  const [scale, setScale] = useState(1);

  /*
   * Keep editor state synchronized with the selected template.
   */
  useEffect(() => {
    setP(getPosition(template));
    setDrag(null);
    setResize(null);
  }, [template.id]);

  /*
   * Calculate the actual displayed scale of the certificate.
   *
   * This fixes the old:
   * useMemo(... [box.current])
   *
   * problem.
   */
  useEffect(() => {
    const element = box.current;

    if (!element) {
      setScale(1);
      return;
    }

    const updateScale = () => {
      const width = element.clientWidth;

      if (!width || !template.template_width) {
        setScale(1);
        return;
      }

      setScale(width / template.template_width);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(element);

    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [template.template_width]);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!box.current) return;

    if (drag) {
      const dx = (e.clientX - drag.sx) / scale;
      const dy = (e.clientY - drag.sy) / scale;

      setP((v) => ({
        ...v,

        x: Math.max(
          0,
          Math.min(
            template.template_width - v.width,
            drag.x + dx
          )
        ),

        y: Math.max(
          0,
          Math.min(
            template.template_height - v.height,
            drag.y + dy
          )
        ),
      }));
    }

    if (resize) {
      const dx = (e.clientX - resize.sx) / scale;
      const dy = (e.clientY - resize.sy) / scale;

      setP((v) => ({
        ...v,

        width: Math.max(
          80,
          Math.min(
            template.template_width - v.x,
            resize.w + dx
          )
        ),

        height: Math.max(
          30,
          Math.min(
            template.template_height - v.y,
            resize.h + dy
          )
        ),
      }));
    }
  };

  const reset = () => {
    setP(getPosition(template));
  };

  const updateFontSize = (value: string) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return;
    }

    setP((v) => ({
      ...v,
      fontSize: Math.max(1, number),
    }));
  };

  const updateMinFontSize = (value: string) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return;
    }

    setP((v) => ({
      ...v,
      minFontSize: Math.max(1, number),
    }));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">

      {/* =========================
          CERTIFICATE PREVIEW
         ========================= */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2">

        <div
          ref={box}
          onPointerMove={move}
          onPointerUp={() => {
            setDrag(null);
            setResize(null);
          }}
          onPointerCancel={() => {
            setDrag(null);
            setResize(null);
          }}
          onPointerLeave={() => {
            if (!drag && !resize) return;

            setDrag(null);
            setResize(null);
          }}
          className="relative mx-auto w-full max-w-5xl select-none"
        >

          <img
            src={template.template_file_url}
            className="block h-auto w-full"
            draggable={false}
            alt="Certificate template"
          />

          {/* NAME BOX */}
          <div
            style={{
              left: `${(p.x / template.template_width) * 100}%`,
              top: `${(p.y / template.template_height) * 100}%`,
              width: `${(p.width / template.template_width) * 100}%`,
              height: `${(p.height / template.template_height) * 100}%`,

              color: p.color,

              fontFamily: `"${p.fontFamily}", sans-serif`,

              /*
               * IMPORTANT:
               * p.fontSize is the REAL certificate font size.
               * scale is only used to display it correctly
               * inside the smaller browser preview.
               */
              fontSize: `${Math.max(
                1,
                p.fontSize * scale
              )}px`,

              fontWeight: p.fontWeight,

              letterSpacing: `${p.letterSpacing * scale}px`,

              lineHeight: p.lineHeight,

              textAlign: p.alignment,

              whiteSpace: p.allowMultiline
                ? 'normal'
                : 'nowrap',

              overflow: 'visible',
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(
                e.pointerId
              );

              setDrag({
                sx: e.clientX,
                sy: e.clientY,
                x: p.x,
                y: p.y,
              });
            }}
            className="absolute flex cursor-move items-center border-2 border-dashed border-cyan-300/40 bg-cyan-300/5 px-1"
          >

            <span
              className="block w-full"
              style={{
                overflow: p.allowMultiline
                  ? 'visible'
                  : 'hidden',

                textOverflow: p.allowMultiline
                  ? 'clip'
                  : 'ellipsis',

                whiteSpace: p.allowMultiline
                  ? 'normal'
                  : 'nowrap',
              }}
            >
              TEST NAME
            </span>

            {/* RESIZE HANDLE */}
            <span
              onPointerDown={(e) => {
                e.stopPropagation();

                e.currentTarget.setPointerCapture(
                  e.pointerId
                );

                setResize({
                  sx: e.clientX,
                  sy: e.clientY,
                  w: p.width,
                  h: p.height,
                });
              }}
              className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-sm bg-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* =========================
          SETTINGS
         ========================= */}
      <div className="space-y-3 rounded-xl border border-white/10 bg-[#101722] p-4">

        {/* FONT */}
        <label className="block text-xs font-semibold text-slate-400">
          Font

          <select
            value={p.fontFamily}
            onChange={(e) =>
              setP((v) => ({
                ...v,
                fontFamily: e.target.value,
              }))
            }
            className="mt-1 w-full rounded-lg border border-white/10 px-3 py-2 text-sm"
          >
            {fonts.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </label>

        {/* FONT SIZE + WEIGHT */}
        <div className="grid grid-cols-2 gap-2">

          <label className="text-xs text-slate-400">
            Font Size

            <Input
              type="number"
              min={1}
              max={500}
              step={1}
              value={p.fontSize}
              onChange={(e) =>
                updateFontSize(e.target.value)
              }
              className="mt-1"
            />

            <span className="mt-1 block text-[10px] text-slate-500">
              Actual certificate size
            </span>
          </label>

          <label className="text-xs text-slate-400">
            Weight

            <select
              value={p.fontWeight}
              onChange={(e) =>
                setP((v) => ({
                  ...v,
                  fontWeight: Number(e.target.value),
                }))
              }
              className="mt-1 w-full rounded-lg border border-white/10 px-3 py-2 text-sm"
            >
              <option value={400}>Regular</option>
              <option value={500}>Medium</option>
              <option value={600}>Semi Bold</option>
              <option value={700}>Bold</option>
            </select>
          </label>
        </div>

        {/* MINIMUM FONT SIZE */}
        <label className="block text-xs text-slate-400">
          Minimum Font Size

          <Input
            type="number"
            min={1}
            max={500}
            step={1}
            value={p.minFontSize}
            onChange={(e) =>
              updateMinFontSize(e.target.value)
            }
            className="mt-1"
          />

          <span className="mt-1 block text-[10px] text-slate-500">
            Long names will shrink only down to this size.
          </span>
        </label>

        {/* ALIGNMENT */}
        <label className="block text-xs text-slate-400">
          Alignment

          <select
            value={p.alignment}
            onChange={(e) =>
              setP((v) => ({
                ...v,
                alignment:
                  e.target.value as TemplatePosition['alignment'],
              }))
            }
            className="mt-1 w-full rounded-lg border border-white/10 px-3 py-2 text-sm"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>

        {/* TEXT COLOR */}
        <label className="block text-xs text-slate-400">
          Text Color

          <Input
            type="color"
            value={p.color}
            onChange={(e) =>
              setP((v) => ({
                ...v,
                color: e.target.value,
              }))
            }
            className="mt-1 h-10 p-1"
          />
        </label>

        {/* LETTER SPACING */}
        <label className="block text-xs text-slate-400">
          Letter Spacing

          <Input
            type="number"
            step="0.1"
            value={p.letterSpacing}
            onChange={(e) =>
              setP((v) => ({
                ...v,
                letterSpacing: Number(e.target.value),
              }))
            }
            className="mt-1"
          />
        </label>

        {/* MULTILINE */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={p.allowMultiline}
            onChange={(e) =>
              setP((v) => ({
                ...v,
                allowMultiline: e.target.checked,
              }))
            }
          />

          Allow multiline
        </label>

        {/* BUTTONS */}
        <div className="grid grid-cols-2 gap-2 pt-2">

          <Button
            variant="secondary"
            onClick={reset}
          >
            Reset
          </Button>

          <Button
            onClick={() => onSave(p)}
          >
            Save
          </Button>

        </div>
      </div>
    </div>
  );
}