import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import { getCompanyConfig } from './company-config';
import { isSmk3OrQhseDocument } from './qhse-detector';

export interface WatermarkOptions {
  userName: string;
  userRole?: string;
  verificationToken: string;
  docNumber: string;
  revision: number;
  isQhse?: boolean;
}

// Memory-cached Inter font buffers for high-performance typography
let cachedInterRegular: Buffer | null = null;
let cachedInterBold: Buffer | null = null;
let cachedInterSemi: Buffer | null = null;

function getInterFontBuffers() {
  if (!cachedInterRegular) {
    try {
      const baseDir = path.join(process.cwd(), 'node_modules/@fontsource/inter/files');
      if (fs.existsSync(baseDir)) {
        cachedInterRegular = fs.readFileSync(path.join(baseDir, 'inter-latin-400-normal.woff'));
        cachedInterBold = fs.readFileSync(path.join(baseDir, 'inter-latin-700-normal.woff'));
        cachedInterSemi = fs.readFileSync(path.join(baseDir, 'inter-latin-600-normal.woff'));
      }
    } catch (e) {
      console.warn('Inter font loading fallback to StandardFonts:', e);
    }
  }
  return {
    regular: cachedInterRegular,
    bold: cachedInterBold,
    semi: cachedInterSemi,
  };
}

async function loadInterFonts(pdfDoc: PDFDocument) {
  const buffers = getInterFontBuffers();
  if (buffers.regular && buffers.bold) {
    try {
      pdfDoc.registerFontkit(fontkit);
      const fontRegular = await pdfDoc.embedFont(buffers.regular);
      const fontBold = await pdfDoc.embedFont(buffers.bold);
      const fontSemi = buffers.semi ? await pdfDoc.embedFont(buffers.semi) : fontBold;
      return { fontRegular, fontBold, fontSemi };
    } catch (err) {
      console.warn('Failed to embed Inter font, falling back to Helvetica:', err);
    }
  }
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  return { fontRegular, fontBold, fontSemi: fontBold };
}

/**
 * Generate a clean official PDF document for Enerco Vault with company letterhead
 */
export async function generateDocumentPdf(docInfo: {
  title: string;
  docNumber: string;
  revision: number;
  categoryName: string;
  effectiveDate?: string;
  clauses?: string[];
  department?: string;
  verificationToken?: string;
  isQhse?: boolean;
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size in points
  const { fontRegular, fontBold, fontSemi } = await loadInterFonts(pdfDoc);

  const companyConfig = await getCompanyConfig();
  const { width, height } = page.getSize();

  const isQhse =
    docInfo.isQhse ??
    isSmk3OrQhseDocument({
      title: docInfo.title,
      docNumber: docInfo.docNumber,
      department: docInfo.department,
      categoryName: docInfo.categoryName,
      clauses: docInfo.clauses,
    });

  // Try to load custom company logo if configured
  // Try to load custom company logo if configured (ensure K3 logo is not used as company logo)
  let companyLogoImage: any = null;
  if (companyConfig.logoUrl && !companyConfig.logoUrl.includes('k3-indonesia')) {
    try {
      let logoBuf: Buffer | null = null;
      const logoUrl = companyConfig.logoUrl.trim();
      if (logoUrl.startsWith('data:image/')) {
        const base64Data = logoUrl.split(',')[1];
        if (base64Data) logoBuf = Buffer.from(base64Data, 'base64');
      } else if (logoUrl.startsWith('/')) {
        const cleanPath = logoUrl.replace(/^\//, '').split('?')[0];
        const localPath = path.join(process.cwd(), 'public', cleanPath);
        if (fs.existsSync(localPath)) logoBuf = fs.readFileSync(localPath);
      }
      if (logoBuf) {
        if (logoUrl.includes('jpeg') || logoUrl.includes('jpg')) {
          companyLogoImage = await pdfDoc.embedJpg(logoBuf);
        } else {
          companyLogoImage = await pdfDoc.embedPng(logoBuf);
        }
      }
    } catch (err) {
      console.warn('Failed to embed corporate logo into PDF:', err);
    }
  }

  // Try to load official K3 Indonesia Logo if document is SMK3 / QHSE related
  let k3LogoImage: any = null;
  if (isQhse) {
    try {
      const k3Path = path.join(process.cwd(), 'public/images/k3-indonesia-logo.png');
      if (fs.existsSync(k3Path)) {
        const k3Buf = fs.readFileSync(k3Path);
        k3LogoImage = await pdfDoc.embedPng(k3Buf);
      }
    } catch (err) {
      console.warn('Failed to embed K3 Indonesia logo into PDF:', err);
    }
  }

  // Helper function to truncate text safely within cell boundaries
  const fitText = (text: string, font: any, size: number, maxWidth: number): string => {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 3 && font.widthOfTextAtSize(truncated + '...', size) > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  };

  // Structured Audit-Grade Letterhead Box
  const boxX = 40;
  const boxH = 76;
  const boxY = height - 120;
  const boxW = width - 80; // 515.28 pt on A4

  // Outer Letterhead Frame
  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    borderWidth: 1.2,
    borderColor: isQhse ? rgb(0.12, 0.32, 0.22) : rgb(0.18, 0.24, 0.35),
    color: rgb(1, 1, 1),
  });

  // Cell Dimensions & Dividers
  // Col 1 (Logo): x = 40 to 132 (width 92)
  const col1W = 92;
  const div1X = boxX + col1W;

  // Col 3 & 4 X positions depend on QHSE statutory badge
  const col3W = isQhse ? 58 : 0;
  const col4W = 138;
  const col2W = boxW - col1W - col3W - col4W; // ~227 pt (if QHSE) or ~285 pt (if non-QHSE)

  const div2X = div1X + col2W;
  const div3X = isQhse ? div2X + col3W : div2X;

  // Draw Vertical Column Dividers
  const dividerColor = rgb(0.8, 0.84, 0.89);
  page.drawLine({
    start: { x: div1X, y: boxY },
    end: { x: div1X, y: boxY + boxH },
    thickness: 0.8,
    color: dividerColor,
  });

  page.drawLine({
    start: { x: div2X, y: boxY },
    end: { x: div2X, y: boxY + boxH },
    thickness: 0.8,
    color: dividerColor,
  });

  if (isQhse) {
    page.drawLine({
      start: { x: div3X, y: boxY },
      end: { x: div3X, y: boxY + boxH },
      thickness: 0.8,
      color: dividerColor,
    });
  }

  // CELL 1: Corporate Logo (Centered & Proportional)
  if (companyLogoImage) {
    const fit = companyLogoImage.scaleToFit(76, 56);
    const imgX = boxX + (col1W - fit.width) / 2;
    const imgY = boxY + (boxH - fit.height) / 2;
    page.drawImage(companyLogoImage, {
      x: imgX,
      y: imgY,
      width: fit.width,
      height: fit.height,
    });
  } else {
    // Elegant Corporate Placeholder Crest
    const crestW = 48;
    const crestH = 46;
    const crestX = boxX + (col1W - crestW) / 2;
    const crestY = boxY + (boxH - crestH) / 2;
    page.drawRectangle({
      x: crestX,
      y: crestY,
      width: crestW,
      height: crestH,
      borderWidth: 0.8,
      borderColor: rgb(0.72, 0.78, 0.86),
      color: rgb(0.96, 0.97, 0.99),
    });
    const logoPlaceholder = 'LOGO';
    const placeW = fontBold.widthOfTextAtSize(logoPlaceholder, 8.5);
    page.drawText(logoPlaceholder, {
      x: crestX + (crestW - placeW) / 2,
      y: crestY + (crestH - 8.5) / 2 + 1,
      size: 8.5,
      font: fontBold,
      color: rgb(0.35, 0.45, 0.6),
    });
  }

  // CELL 2: Corporate & System Identification (Strict Boundary Checked)
  const cell2Pad = 9;
  const cell2X = div1X + cell2Pad;
  const cell2MaxTextW = col2W - cell2Pad * 2;

  // Line 1: System Classification
  const systemTitle = fitText(
    `${companyConfig.systemName.toUpperCase()} — INTEGRATED SYSTEM`,
    fontBold,
    7.5,
    cell2MaxTextW
  );
  page.drawText(systemTitle, {
    x: cell2X,
    y: boxY + 53,
    size: 7.5,
    font: fontBold,
    color: rgb(0.12, 0.28, 0.58),
  });

  // Line 2: Company Official Name (Prominent & Clear)
  const companyTitle = fitText(
    companyConfig.companyName.toUpperCase(),
    fontBold,
    9.5,
    cell2MaxTextW
  );
  page.drawText(companyTitle, {
    x: cell2X,
    y: boxY + 38,
    size: 9.5,
    font: fontBold,
    color: rgb(0.09, 0.13, 0.2),
  });

  // Line 3: Department / Subtext
  const subtext = fitText(
    companyConfig.headerSubtext.toUpperCase(),
    fontRegular,
    6.8,
    cell2MaxTextW
  );
  page.drawText(subtext, {
    x: cell2X,
    y: boxY + 24,
    size: 6.8,
    font: fontRegular,
    color: rgb(0.38, 0.44, 0.52),
  });

  // Line 4: Statutory Jurisdiction / Location
  const locationText = fitText(
    companyConfig.officeLocation ? companyConfig.officeLocation.toUpperCase() : 'INDONESIA',
    fontRegular,
    6.2,
    cell2MaxTextW
  );
  page.drawText(locationText, {
    x: cell2X,
    y: boxY + 11,
    size: 6.2,
    font: fontRegular,
    color: rgb(0.48, 0.54, 0.62),
  });

  // CELL 3: Statutory K3 Indonesia Regulatory Emblem (SMK3 / QHSE only)
  if (isQhse) {
    // Subtle regulatory compliance background tint
    page.drawRectangle({
      x: div2X + 0.5,
      y: boxY + 0.5,
      width: col3W - 1,
      height: boxH - 1,
      color: rgb(0.97, 0.99, 0.98),
    });

    const k3TopText = 'K3 INDONESIA';
    const k3TopW = fontBold.widthOfTextAtSize(k3TopText, 5.2);
    page.drawText(k3TopText, {
      x: div2X + (col3W - k3TopW) / 2,
      y: boxY + 60,
      size: 5.2,
      font: fontBold,
      color: rgb(0.06, 0.48, 0.22),
    });

    if (k3LogoImage) {
      const k3Size = 25;
      const k3ImgX = div2X + (col3W - k3Size) / 2;
      const k3ImgY = boxY + 23;
      page.drawImage(k3LogoImage, {
        x: k3ImgX,
        y: k3ImgY,
        width: k3Size,
        height: k3Size,
      });
    }

    const k3BotText = 'SMK3 PP 50/2012';
    const k3BotW = fontBold.widthOfTextAtSize(k3BotText, 4.6);
    page.drawText(k3BotText, {
      x: div2X + (col3W - k3BotW) / 2,
      y: boxY + 10,
      size: 4.6,
      font: fontBold,
      color: rgb(0.1, 0.42, 0.2),
    });
  }

  // CELL 4: Document Control Register (Audited 4-Row Grid)
  const rowH = boxH / 4; // 19 pt per row
  const rowLineColor = rgb(0.85, 0.88, 0.92);

  // Horizontal Grid Lines in Cell 4
  for (let i = 1; i < 4; i++) {
    const rowY = boxY + i * rowH;
    page.drawLine({
      start: { x: div3X, y: rowY },
      end: { x: boxX + boxW, y: rowY },
      thickness: 0.6,
      color: rowLineColor,
    });
  }

  const metaLabelX = div3X + 7;
  const metaValX = div3X + 46;

  // Row 1: Document Number
  page.drawText('NO. DOK', {
    x: metaLabelX,
    y: boxY + 3 * rowH + 6,
    size: 5.5,
    font: fontBold,
    color: rgb(0.42, 0.48, 0.56),
  });
  const docNumText = fitText(docInfo.docNumber, fontBold, 7.5, col4W - 52);
  page.drawText(docNumText, {
    x: metaValX,
    y: boxY + 3 * rowH + 5.5,
    size: 7.5,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  // Row 2: Revision & Effective Date
  page.drawText('REVISI', {
    x: metaLabelX,
    y: boxY + 2 * rowH + 6,
    size: 5.5,
    font: fontBold,
    color: rgb(0.42, 0.48, 0.56),
  });
  const revText = `${String(docInfo.revision).padStart(2, '0')}`;
  page.drawText(revText, {
    x: metaValX,
    y: boxY + 2 * rowH + 5.5,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35),
  });

  // Row 3: Document Controlled Status
  page.drawText('STATUS', {
    x: metaLabelX,
    y: boxY + 1 * rowH + 6,
    size: 5.5,
    font: fontBold,
    color: rgb(0.42, 0.48, 0.56),
  });
  page.drawText('TERKENDALI / APPROVED', {
    x: metaValX,
    y: boxY + 1 * rowH + 6,
    size: 6.5,
    font: fontBold,
    color: rgb(0.06, 0.52, 0.24),
  });

  // Row 4: Statutory Compliance / Regulatory Authority
  page.drawText(isQhse ? 'REGULASI' : 'DISTRIBUSI', {
    x: metaLabelX,
    y: boxY + 6,
    size: 5.5,
    font: fontBold,
    color: rgb(0.42, 0.48, 0.56),
  });
  const row4Val = isQhse ? 'KEMNAKER RI / PP 50' : 'INTERNAL CONTROLLED';
  page.drawText(row4Val, {
    x: metaValX,
    y: boxY + 6,
    size: 6.2,
    font: fontBold,
    color: isQhse ? rgb(0.08, 0.46, 0.22) : rgb(0.3, 0.35, 0.45),
  });

  // Document Title
  page.drawText(docInfo.title.toUpperCase(), {
    x: 40,
    y: height - 160,
    size: 15,
    font: fontBold,
    color: rgb(0.08, 0.1, 0.18),
  });

  // Metadata Table Info
  const startY = height - 195;
  page.drawText(`Kategori Taksonomi : ${docInfo.categoryName}`, {
    x: 40,
    y: startY,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35),
  });

  page.drawText(`Unit Kerja / Departemen : ${docInfo.department || 'Korporat / QHSE'}`, {
    x: 40,
    y: startY - 18,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35),
  });

  page.drawText(`Tanggal Berlaku : ${docInfo.effectiveDate || 'Segera Setelah Pengesahan'}`, {
    x: 40,
    y: startY - 36,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35),
  });

  // Compliance Clause Mapping Section
  page.drawRectangle({
    x: 40,
    y: startY - 110,
    width: width - 80,
    height: 55,
    borderWidth: 1,
    borderColor: rgb(0.8, 0.85, 0.9),
    color: rgb(0.96, 0.98, 0.99),
  });

  page.drawText('PEMETAAN STANDAR TERINTEGRASI (IMS / QHSE / PP 50):', {
    x: 50,
    y: startY - 75,
    size: 8.5,
    font: fontBold,
    color: rgb(0.1, 0.3, 0.5),
  });

  const clauseStr =
    docInfo.clauses && docInfo.clauses.length > 0
      ? docInfo.clauses.join('  •  ')
      : 'Klausul 4 s/d 10 Terpenuhi Sesuai Kebijakan Terpadu Korporat';

  page.drawText(clauseStr, {
    x: 50,
    y: startY - 95,
    size: 8,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35),
  });

  // Body Content Sample
  page.drawText('1. TUJUAN & RUANG LINGKUP', {
    x: 40,
    y: startY - 145,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  page.drawText(
    `Dokumen ini menetapkan persyaratan dan prosedur operasional baku dalam lingkup ${companyConfig.companyName},`,
    { x: 40, y: startY - 165, size: 9, font: fontRegular, color: rgb(0.25, 0.3, 0.38) }
  );
  page.drawText(
    'memastikan keselarasan dengan ketentuan perundangan RI, SMK3 PP No. 50/2012, serta standar ISO 9001/14001/45001.',
    { x: 40, y: startY - 180, size: 9, font: fontRegular, color: rgb(0.25, 0.3, 0.38) }
  );

  page.drawText('2. TANGGUNG JAWAB & PENGENDALIAN', {
    x: 40,
    y: startY - 215,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  page.drawText(
    'Seluruh personil terkait wajib mematuhi seluruh instruksi dan tata kelola yang tercantum pada dokumen ini.',
    { x: 40, y: startY - 235, size: 9, font: fontRegular, color: rgb(0.25, 0.3, 0.38) }
  );
  page.drawText(
    'Salinan hardcopy yang sah hanya yang memiliki stempel validasi aktif dan QR Code verifikasi resmi.',
    { x: 40, y: startY - 250, size: 9, font: fontRegular, color: rgb(0.25, 0.3, 0.38) }
  );

  // Digital Sign Off Box (Audit Certification Block)
  const signBoxX = 40;
  const signBoxY = 48;
  const signBoxW = width - 80;
  const signBoxH = 76;

  page.drawRectangle({
    x: signBoxX,
    y: signBoxY,
    width: signBoxW,
    height: signBoxH,
    borderWidth: 1,
    borderColor: rgb(0.74, 0.8, 0.88),
    color: rgb(1, 1, 1),
  });

  // Header Banner Ribbon
  const signHeaderH = 18;
  page.drawRectangle({
    x: signBoxX + 0.5,
    y: signBoxY + signBoxH - signHeaderH,
    width: signBoxW - 1,
    height: signHeaderH - 0.5,
    color: rgb(0.95, 0.97, 0.99),
  });
  page.drawLine({
    start: { x: signBoxX, y: signBoxY + signBoxH - signHeaderH },
    end: { x: signBoxX + signBoxW, y: signBoxY + signBoxH - signHeaderH },
    thickness: 0.8,
    color: rgb(0.8, 0.85, 0.9),
  });

  page.drawText(
    `LEMBAR PENGESAHAN ELEKTRONIK & TATA KELOLA TERINTEGRASI (${companyConfig.systemName.toUpperCase()} SIGN-OFF)`,
    {
      x: signBoxX + 9,
      y: signBoxY + signBoxH - 12.5,
      size: 7.2,
      font: fontBold,
      color: rgb(0.12, 0.22, 0.42),
    }
  );

  const sealStatusText = 'STATUS: TERVERIFIKASI & SAH SECARA SISTEM';
  const sealStatusW = fontBold.widthOfTextAtSize(sealStatusText, 6.2);
  page.drawText(sealStatusText, {
    x: signBoxX + signBoxW - 9 - sealStatusW,
    y: signBoxY + signBoxH - 12,
    size: 6.2,
    font: fontBold,
    color: rgb(0.06, 0.52, 0.24),
  });

  // Sign-off Matrix Columns
  const signCol1W = 125;
  const signCol2W = 125;
  const signCol3W = 125;
  const signCol4W = signBoxW - signCol1W - signCol2W - signCol3W; // ~140.28 pt

  const signDiv1X = signBoxX + signCol1W;
  const signDiv2X = signDiv1X + signCol2W;
  const signDiv3X = signDiv2X + signCol3W;

  const signDivColor = rgb(0.85, 0.88, 0.92);
  const matrixBottomY = signBoxY;
  const matrixTopY = signBoxY + signBoxH - signHeaderH;

  page.drawLine({ start: { x: signDiv1X, y: matrixBottomY }, end: { x: signDiv1X, y: matrixTopY }, thickness: 0.6, color: signDivColor });
  page.drawLine({ start: { x: signDiv2X, y: matrixBottomY }, end: { x: signDiv2X, y: matrixTopY }, thickness: 0.6, color: signDivColor });
  page.drawLine({ start: { x: signDiv3X, y: matrixBottomY }, end: { x: signDiv3X, y: matrixTopY }, thickness: 0.6, color: signDivColor });

  const effectiveDateLabel = docInfo.effectiveDate || '26 Okt 2026';

  // Column 1: Penyusun
  page.drawText('1. DISUSUN OLEH', { x: signBoxX + 8, y: signBoxY + 44, size: 5.2, font: fontBold, color: rgb(0.42, 0.48, 0.56) });
  page.drawText('Document Controller', { x: signBoxX + 8, y: signBoxY + 32, size: 7.2, font: fontBold, color: rgb(0.12, 0.16, 0.24) });
  page.drawText('Departemen Dokumen & Arsip', { x: signBoxX + 8, y: signBoxY + 22, size: 5.8, font: fontRegular, color: rgb(0.4, 0.45, 0.54) });
  page.drawText('[TERVALIDASI SISTEM]', { x: signBoxX + 8, y: signBoxY + 12, size: 6, font: fontSemi, color: rgb(0.06, 0.52, 0.24) });
  page.drawText(`Tgl: ${effectiveDateLabel}`, { x: signBoxX + 8, y: signBoxY + 3.5, size: 5.5, font: fontRegular, color: rgb(0.48, 0.53, 0.6) });

  // Column 2: Pemeriksa
  page.drawText('2. DIPERIKSA OLEH', { x: signDiv1X + 8, y: signBoxY + 44, size: 5.2, font: fontBold, color: rgb(0.42, 0.48, 0.56) });
  page.drawText('QHSE & Compliance Lead', { x: signDiv1X + 8, y: signBoxY + 32, size: 7.2, font: fontBold, color: rgb(0.12, 0.16, 0.24) });
  page.drawText('Seksi Audit & Mutu Terpadu', { x: signDiv1X + 8, y: signBoxY + 22, size: 5.8, font: fontRegular, color: rgb(0.4, 0.45, 0.54) });
  page.drawText('[TELAH DITINJAU]', { x: signDiv1X + 8, y: signBoxY + 12, size: 6, font: fontSemi, color: rgb(0.06, 0.52, 0.24) });
  page.drawText(`Tgl: ${effectiveDateLabel}`, { x: signDiv1X + 8, y: signBoxY + 3.5, size: 5.5, font: fontRegular, color: rgb(0.48, 0.53, 0.6) });

  // Column 3: Pengesah Akhir
  page.drawText('3. DISETUJUI OLEH', { x: signDiv2X + 8, y: signBoxY + 44, size: 5.2, font: fontBold, color: rgb(0.42, 0.48, 0.56) });
  page.drawText('Direktur / Authorized Signer', { x: signDiv2X + 8, y: signBoxY + 32, size: 7.2, font: fontBold, color: rgb(0.12, 0.16, 0.24) });
  page.drawText('Otoritas Manajemen Puncak', { x: signDiv2X + 8, y: signBoxY + 22, size: 5.8, font: fontRegular, color: rgb(0.4, 0.45, 0.54) });
  page.drawText('[DISAHKAN RESMI]', { x: signDiv2X + 8, y: signBoxY + 12, size: 6, font: fontSemi, color: rgb(0.06, 0.52, 0.24) });
  page.drawText(`Tgl: ${effectiveDateLabel}`, { x: signDiv2X + 8, y: signBoxY + 3.5, size: 5.5, font: fontRegular, color: rgb(0.48, 0.53, 0.6) });

  // Column 4: Digital Verification QR Code
  try {
    const token = docInfo.verificationToken || `EV-${docInfo.docNumber}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify/${token}`;
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      type: 'png',
      width: 140,
      margin: 1,
      color: { dark: '#0a192f', light: '#ffffff' },
    });
    const qrImage = await pdfDoc.embedPng(qrBuffer);
    const qrSize = 38;
    const qrX = signDiv3X + (signCol4W - qrSize) / 2;
    const qrY = signBoxY + 13;

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    const qrTopText = 'VERIFIKASI INTEGRITAS';
    const qrTopW = fontBold.widthOfTextAtSize(qrTopText, 5);
    page.drawText(qrTopText, {
      x: signDiv3X + (signCol4W - qrTopW) / 2,
      y: signBoxY + 44,
      size: 5,
      font: fontBold,
      color: rgb(0.12, 0.24, 0.48),
    });

    const qrBotText = 'PINDAI VALIDASI RESMI';
    const qrBotW = fontRegular.widthOfTextAtSize(qrBotText, 4.6);
    page.drawText(qrBotText, {
      x: signDiv3X + (signCol4W - qrBotW) / 2,
      y: signBoxY + 4.5,
      size: 4.6,
      font: fontRegular,
      color: rgb(0.38, 0.44, 0.52),
    });
  } catch (err) {
    console.warn('Failed to embed QR code into generated PDF:', err);
  }

  // Institutional Running Page Footer
  const footerLineY = 34;
  page.drawLine({
    start: { x: 40, y: footerLineY },
    end: { x: width - 40, y: footerLineY },
    thickness: 0.75,
    color: rgb(0.82, 0.86, 0.9),
  });

  page.drawText(`${companyConfig.systemName.toUpperCase()} IMS • ${companyConfig.companyName.toUpperCase()}`, {
    x: 40,
    y: 22,
    size: 6.5,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  page.drawText('Dokumen ini bersifat Terkendali. Penggandaan tanpa otorisasi Document Controller dilarang keras.', {
    x: 40,
    y: 12,
    size: 5.5,
    font: fontRegular,
    color: rgb(0.48, 0.53, 0.6),
  });

  const pageStr = 'Halaman 1 dari 1';
  const pageStrW = fontBold.widthOfTextAtSize(pageStr, 6.5);
  page.drawText(pageStr, {
    x: (width - pageStrW) / 2,
    y: 22,
    size: 6.5,
    font: fontBold,
    color: rgb(0.25, 0.3, 0.4),
  });

  const classStr = 'Klasifikasi: Terkendali Internal';
  const classStrW = fontRegular.widthOfTextAtSize(classStr, 5.5);
  page.drawText(classStr, {
    x: (width - classStrW) / 2,
    y: 12,
    size: 5.5,
    font: fontRegular,
    color: rgb(0.48, 0.53, 0.6),
  });

  const docRef = `${docInfo.docNumber} | Rev. ${String(docInfo.revision).padStart(2, '0')}`;
  const docRefW = fontBold.widthOfTextAtSize(docRef, 6.5);
  page.drawText(docRef, {
    x: width - 40 - docRefW,
    y: 22,
    size: 6.5,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.3),
  });

  const stdRef = 'Kepatuhan: ISO 9001 • ISO 14001 • ISO 45001 • SMK3 PP 50';
  const stdRefW = fontRegular.widthOfTextAtSize(stdRef, 5.5);
  page.drawText(stdRef, {
    x: width - 40 - stdRefW,
    y: 12,
    size: 5.5,
    font: fontRegular,
    color: rgb(0.48, 0.53, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Stamp dynamic controlled copy watermark on existing PDF
 */
export async function stampControlledWatermark(
  pdfBuffer: Buffer,
  options: WatermarkOptions
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const { fontRegular, fontBold } = await loadInterFonts(pdfDoc);
  const now = new Date();
  const dateStr = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Prepare QR code badge if verificationToken is provided
  let qrImage: any = null;
  if (options.verificationToken) {
    try {
      const verifyUrl = `${baseUrl}/verify/${options.verificationToken}`;
      const qrBuffer = await QRCode.toBuffer(verifyUrl, {
        type: 'png',
        width: 140,
        margin: 1,
        color: { dark: '#0a192f', light: '#ffffff' },
      });
      qrImage = await pdfDoc.embedPng(qrBuffer);
    } catch (err) {
      console.warn('Failed to generate watermark QR code:', err);
    }
  }

  const pages = pdfDoc.getPages();
  for (let idx = 0; idx < pages.length; idx++) {
    const page = pages[idx];
    const { width } = page.getSize();

    // High-Security Controlled Audit Runner (Bottom Bar)
    const runnerH = 25;
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: runnerH,
      color: rgb(0.98, 0.98, 0.99),
    });

    page.drawLine({
      start: { x: 0, y: runnerH },
      end: { x: width, y: runnerH },
      thickness: 0.75,
      color: rgb(0.82, 0.86, 0.92),
    });

    // Red indicator accent tag on left margin
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 4.5,
      height: runnerH,
      color: rgb(0.82, 0.15, 0.15),
    });

    // Row 1: Controlled copy identifier & Token
    page.drawText('SALINAN TERKENDALI RESMI (CONTROLLED COPY)', {
      x: 20,
      y: 14,
      size: 6.5,
      font: fontBold,
      color: rgb(0.72, 0.12, 0.12),
    });

    const tokenText = `Token Keamanan: ${options.verificationToken}`;
    const tokenW = fontBold.widthOfTextAtSize(tokenText, 6.2);
    page.drawText(tokenText, {
      x: width - 20 - tokenW,
      y: 14,
      size: 6.2,
      font: fontBold,
      color: rgb(0.2, 0.26, 0.38),
    });

    // Row 2: User audit trail & verification link
    const auditInfo = `Diunduh oleh: ${options.userName} (${options.userRole || 'User'}) • Waktu: ${dateStr} WIB`;
    page.drawText(auditInfo, {
      x: 20,
      y: 4.5,
      size: 5.6,
      font: fontRegular,
      color: rgb(0.38, 0.44, 0.52),
    });

    const verifyHint = `Periksa Keaslian: ${baseUrl}/verify/${options.verificationToken}`;
    const verifyHintW = fontRegular.widthOfTextAtSize(verifyHint, 5.4);
    page.drawText(verifyHint, {
      x: width - 20 - verifyHintW,
      y: 4.5,
      size: 5.4,
      font: fontRegular,
      color: rgb(0.45, 0.5, 0.58),
    });

    // Stamp official scannable QR badge on the first page
    if (idx === 0 && qrImage) {
      const sealW = 74;
      const sealH = 68;
      const sealX = width - 40 - sealW;
      const sealY = 32;

      // Outer Card
      page.drawRectangle({
        x: sealX,
        y: sealY,
        width: sealW,
        height: sealH,
        borderColor: rgb(0.2, 0.35, 0.65),
        borderWidth: 0.8,
        color: rgb(1, 1, 1),
      });

      // Top ribbon
      const ribbonH = 14;
      page.drawRectangle({
        x: sealX + 0.5,
        y: sealY + sealH - ribbonH,
        width: sealW - 1,
        height: ribbonH - 0.5,
        color: rgb(0.12, 0.24, 0.48),
      });

      const ribbonText = 'KEABSAHAN DOKUMEN';
      const ribbonW = fontBold.widthOfTextAtSize(ribbonText, 5.2);
      page.drawText(ribbonText, {
        x: sealX + (sealW - ribbonW) / 2,
        y: sealY + sealH - 10,
        size: 5.2,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      const qrSize = 36;
      page.drawImage(qrImage, {
        x: sealX + (sealW - qrSize) / 2,
        y: sealY + 14,
        width: qrSize,
        height: qrSize,
      });

      const sealBotText = 'PINDAI VERIFIKASI';
      const sealBotW = fontBold.widthOfTextAtSize(sealBotText, 4.8);
      page.drawText(sealBotText, {
        x: sealX + (sealW - sealBotW) / 2,
        y: sealY + 4,
        size: 4.8,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.35),
      });
    }
  }

  const outputBytes = await pdfDoc.save();
  return Buffer.from(outputBytes);
}
