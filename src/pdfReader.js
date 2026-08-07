import * as pdfjsLib from 'pdfjs-dist';

// ───────────────────────────────────────────────
// ⚙️ إعداد Worker
// ───────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ───────────────────────────────────────────────
// 🚫 قوائم الاستبعاد
// ───────────────────────────────────────────────
const EXCLUDED_PRICES = new Set([
  '100', '200', '300', '400', '500', '600', '700', '800', '900',
  '1000', '1500', '2000', '2500', '3000', '5000', '10000'
]);

// ───────────────────────────────────────────────
// 🔍 التعبير النمطي لكود الكرت
// ───────────────────────────────────────────────
const CARD_CODE_REGEX = /\b[a-zA-Z]?\d{7,10}\b/g;

// ───────────────────────────────────────────────
// 🎯 الدالة الرئيسية (محسّنة)
// ───────────────────────────────────────────────
export async function extractCardsFromPDF(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      useSystemFonts: true, // ⭐ إضافة مهمة
    });

    const pdfDocument = await loadingTask.promise;
    const extractedCards: string[] = [];
    const seenCodes = new Set<string>(); // ⭐ أسرع من includes()

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      const items = textContent.items as any[];

      // ⭐ ترتيب النصوص حسب موقعها المكاني (منع خلط الأرقام)
      items.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.transform[4] - b.transform[4];
      });

      const pageStrings = items
        .map(item => item.str ? item.str.trim() : '')
        .filter(str => str.length > 0);

      // ⭐ استخراج سطراً بسطر بدلاً من دمج الكل
      for (const line of pageStrings) {
        const cleanedLine = line
          .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const matches = cleanedLine.match(CARD_CODE_REGEX) || [];

        for (const code of matches) {
          const normalizedCode = code.toUpperCase(); // ⭐ توحيد الحالة

          // فلاتر الاستبعاد
          const isPhoneNumber = /^0?7[7|3|1|8]\d{7}$/.test(normalizedCode);
          const isPrice = EXCLUDED_PRICES.has(normalizedCode);

          if (isPhoneNumber || isPrice) continue;
          if (normalizedCode.length < 7 || normalizedCode.length > 11) continue;

          // ⭐ تجنب التكرار
          if (!seenCodes.has(normalizedCode)) {
            seenCodes.add(normalizedCode);
            extractedCards.push(normalizedCode);
          }
        }
      }
    }

    return extractedCards;
  } catch (error) {
    console.error("❌ خطأ أثناء استخراج الكروت من الـ PDF:", error);
    throw new Error("تعذر قراءة الكروت من هذا الملف، تأكد من أن الملف غير محمي بكلمة سر وصيغته صحيحة.");
  }
}
