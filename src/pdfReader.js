import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ───────────────────────────────────────────────
// 🚫 قائمة الاستبعاد الكاملة (أسعار + كلمات PDF الداخلية)
// ───────────────────────────────────────────────
const BLOCKED_KEYWORDS = new Set([
  // كلمات PDF الداخلية
  'PDF', 'OBJ', 'STREAM', 'FILTER', 'LENGTH', 'DEVICERGB', 'ALTERNATE',
  'FLATEDECODE', 'CMAP', 'FONT', 'XOBJECT', 'RESOURCES', 'MEDIABOX',
  'CROPBOX', 'ANNOT', 'STRUCTTREE', 'MARKINFO', 'SPIDERINFO',
  'VIEWERPREFERENCES', 'PAGELAYOUT', 'PAGEMODE', 'OUTLINES', 'THREADS',
  'NAMES', 'ENCRYPT', 'EXTGSTATE', 'COLORSPACE', 'PATTERN', 'SHADING',
  'XREF', 'TRAILER', 'STARTXREF', 'ROOT', 'INFO', 'ID', 'SIZE', 'PREV',
  'TYPE', 'SUBTYPE', 'BASEFONT', 'ENCODING', 'WIDTHS', 'FIRSTCHAR',
  'LASTCHAR', 'FONTDESCRIPTOR', 'FLAGS', 'ITALICANGLE', 'ASCENT',
  'DESCENT', 'CAPHEIGHT', 'STEMV', 'FONTFILE', 'FONTFILE2', 'FONTFILE3',
  'CHARSET', 'FONTBBOX', 'MISSINGWIDTH', 'DW', 'W', 'WIDTH', 'HEIGHT',
  'BBOX', 'FORMTYPE', 'MATRIX', 'PROCSET', 'PROPERTIES', 'LENGTH1',
  'LENGTH2', 'LENGTH3', 'DECODEPARMS', 'PREDICTOR', 'COLUMNS', 'COLORS',
  'BITS', 'DEVICE', 'CALGRAY', 'CALRGB', 'LAB', 'ICCBASED', 'INDEXED',
  'SEPARATION', 'DEVICEN', 'ALPHA', 'CA', 'CA_', 'BM', 'SM', 'TR',
  'TR2', 'HT', 'FL', 'BG', 'UCR', 'UCR2', 'BG2', 'FLATE', 'LZW', 'DCT',
  'ASCII', 'HEX', 'RUNLENGTH', 'TIFF', 'JPEG', 'JPX', 'JBIG2', 'CRYPT',
  'STANDARD', 'V', 'R', 'N', 'F', 'ENDOBJ', 'ENDSTREAM',
  // أسعار شائعة
  '100', '200', '300', '400', '500', '600', '700', '800', '900',
  '1000', '1500', '2000', '2500', '3000', '5000', '10000'
]);

// ✅ نمط كود الكرت: حرف اختياري + 7 إلى 10 أرقام (لا غير)
const CARD_REGEX = /^[A-Za-z]?\d{7,10}$/;

// ✅ نمط رقم الهاتف اليمني
const PHONE_REGEX = /^0?7[7|3|1|8]\d{7}$/;

export async function extractCardsFromPDF(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      useSystemFonts: true,
    });

    const pdfDocument = await loadingTask.promise;
    const extractedCards: string[] = [];
    const seenCodes = new Set<string>();

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      const items = textContent.items as any[];

      // ترتيب النصوص حسب موقعها المكاني (منع خلط الأسطر)
      items.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.transform[4] - b.transform[4];
      });

      for (const item of items) {
        const raw = item.str || '';
        if (!raw || raw.trim().length < 7) continue;

        // ── تنظيف شديد: نحتفظ فقط بالأحرف الإنجليزية والأرقام ──
        const cleaned = raw
          .replace(/[^A-Za-z0-9\s]/g, ' ')   // حذف كل الرموز الغريبة
          .replace(/\s+/g, ' ')              // تقليل الفراغات
          .trim();

        if (!cleaned || cleaned.length < 7) continue;

        // ── تقسيم النص إلى كلمات منفصلة واختبار كل كلمة ──
        const tokens = cleaned.split(' ');

        for (const token of tokens) {
          const candidate = token.trim();

          // 1️⃣ الطول يجب أن يكون بين 7 و 11
          if (candidate.length < 7 || candidate.length > 11) continue;

          // 2️⃣ يجب أن يطابق نمط الكرت بالضبط
          if (!CARD_REGEX.test(candidate)) continue;

          const upper = candidate.toUpperCase();

          // 3️⃣ استبعاد كلمات PDF الداخلية والأسعار
          if (BLOCKED_KEYWORDS.has(upper)) continue;

          // 4️⃣ استبعاد أرقام الهواتف
          if (PHONE_REGEX.test(upper)) continue;

          // 5️⃣ إذا بدأ بحرف، يجب أن يتبعه أرقام فقط
          if (/^[A-Za-z]/.test(upper) && !/^[A-Za-z]\d+$/.test(upper)) continue;

          // 6️⃣ استبعاد أي رقم طويل يشبه الهاتف (9-11 رقم بدون حرف)
          if (/^\d{9,11}$/.test(upper)) continue;

          // 7️⃣ تجنب التكرار
          if (!seenCodes.has(upper)) {
            seenCodes.add(upper);
            extractedCards.push(upper);
          }
        }
      }
    }

    return extractedCards;
  } catch (error) {
    console.error('❌ خطأ في استخراج الكروت:', error);
    throw new Error('تعذر قراءة الكروت من الملف. تأكد من صحة الملف.');
  }
}
