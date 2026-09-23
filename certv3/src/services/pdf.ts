import { jsPDF } from 'jspdf';

import type {
  Certificate,
  CertificateTemplate,
} from '../types';

const imageCache = new Map<string, HTMLImageElement>();

/*
 * Load the custom TTF/OTF font if one was uploaded.
 */
async function loadFont(
  template: CertificateTemplate
) {
  if (!template.font_file_url) {
    return;
  }

  const family = template.font_family;

  const alreadyLoaded = [
    ...document.fonts,
  ].some(
    (font) =>
      font.family === family &&
      font.status === 'loaded'
  );

  if (alreadyLoaded) {
    return;
  }

  const font = new FontFace(
    family,
    `url("${template.font_file_url}")`
  );

  await font.load();

  document.fonts.add(font);

  await document.fonts.load(
    `16px "${family}"`
  );
}

/*
 * Load certificate background image.
 */
async function loadImage(
  url: string
): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);

  if (cached) {
    return cached;
  }

  const img = new Image();

  img.crossOrigin = 'anonymous';

  await new Promise<void>(
    (resolve, reject) => {
      img.onload = () => resolve();

      img.onerror = () =>
        reject(
          new Error(
            'Unable to load certificate template.'
          )
        );

      img.src = url;
    }
  );

  imageCache.set(url, img);

  return img;
}

/*
 * Find the largest font size that fits inside
 * the configured name box.
 *
 * IMPORTANT:
 * The configured font size is used as the
 * starting size.
 *
 * It is reduced ONLY when the name is too long.
 *
 * It will NEVER go below minFontSize.
 */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  weight: number,
  family: string
) {
  let size = Math.max(
    minSize,
    startSize
  );

  const minimum = Math.max(
    1,
    Math.min(minSize, startSize)
  );

  while (size > minimum) {
    ctx.font =
      `${weight} ${size}px "${family}", sans-serif`;

    const width =
      ctx.measureText(text).width;

    if (width <= maxWidth) {
      return size;
    }

    size -= 1;
  }

  /*
   * Make sure the final font is set.
   */
  ctx.font =
    `${weight} ${minimum}px "${family}", sans-serif`;

  return minimum;
}

/*
 * Render the certificate to a canvas.
 */
export async function renderCertificateCanvas(
  certificate: Certificate,
  template: CertificateTemplate
) {
  await loadFont(template);

  const img = await loadImage(
    template.template_file_url
  );

  /*
   * Keep output high resolution while avoiding
   * an unnecessarily huge canvas.
   */
  const scale = Math.min(
    2,
    3000 /
      Math.max(
        template.template_width,
        template.template_height
      )
  );

  const canvas =
    document.createElement('canvas');

  canvas.width = Math.round(
    template.template_width * scale
  );

  canvas.height = Math.round(
    template.template_height * scale
  );

  const ctx =
    canvas.getContext('2d');

  if (!ctx) {
    throw new Error(
      'Canvas is unavailable.'
    );
  }

  /*
   * Draw the original certificate artwork.
   */
  ctx.drawImage(
    img,
    0,
    0,
    canvas.width,
    canvas.height
  );

  /*
   * Convert template coordinates to
   * actual canvas coordinates.
   */
  const x =
    template.name_x * scale;

  const y =
    template.name_y * scale;

  const w =
    template.name_width * scale;

  const h =
    template.name_height * scale;

  /*
   * Selected font size.
   *
   * Example:
   * template.font_size = 72
   * scale = 2
   *
   * Canvas font = 144px
   *
   * This produces 72px in the original
   * certificate coordinate system.
   */
  const startSize =
    Math.max(
      1,
      template.font_size * scale
    );

  const minimumSize =
    Math.max(
      1,
      template.min_font_size * scale
    );

  ctx.fillStyle =
    template.text_color;

  ctx.textBaseline = 'middle';

  ctx.textAlign =
    template.text_alignment;

  /*
   * Automatically shrink ONLY when required
   * to fit a long name.
   */
  const finalSize = fitFont(
    ctx,
    certificate.recipient_name,
    w,
    startSize,
    minimumSize,
    template.font_weight,
    template.font_family
  );

  /*
   * Set the final font.
   */
  ctx.font =
    `${template.font_weight} ${finalSize}px "${template.font_family}", sans-serif`;

  /*
   * Calculate horizontal position based
   * on alignment.
   */
  const tx =
    template.text_alignment === 'left'
      ? x
      : template.text_alignment === 'right'
        ? x + w
        : x + w / 2;

  /*
   * Vertical center of the name box.
   */
  const ty =
    y + h / 2;

  /*
   * Draw ONLY the recipient name.
   *
   * The original certificate artwork remains
   * unchanged.
   */
  ctx.fillText(
    certificate.recipient_name,
    tx,
    ty,
    w
  );

  return canvas;
}

/*
 * Generate and download the PDF.
 */
export async function generatePdf(
  certificate: Certificate,
  template: CertificateTemplate
) {
  const canvas =
    await renderCertificateCanvas(
      certificate,
      template
    );

  const orientation =
    template.template_width >=
    template.template_height
      ? 'landscape'
      : 'portrait';

  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [
      template.template_width,
      template.template_height,
    ],
    compress: true,
  });

  pdf.addImage(
    canvas.toDataURL(
      'image/jpeg',
      0.96
    ),
    'JPEG',
    0,
    0,
    template.template_width,
    template.template_height,
    undefined,
    'FAST'
  );

  pdf.save(
    `${certificate.certificate_id}-${certificate.recipient_name.replace(
      /[^a-z0-9]+/gi,
      '-'
    )}.pdf`
  );
}