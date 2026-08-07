import * as pdfjsLib from "pdfjs-dist";

/**
 * TawasulNetPro
 * استخراج كروت PDF من قالب:
 * - 4 أعمدة
 * - الكرت في منتصف البطاقة
 * - الهاتف أسفل/جانب البطاقة
 * - السعر أسفل البطاقة
 *
 * مهم:
 * لا نعتمد على Prefix ثابت للكرت.
 * الكرت يمكن أن يبدأ بأي حرف إنجليزي أو بأي رقم.
 */

type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  dir?: string;
  hasEOL?: boolean;
};

type TextBox = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

type CardCandidate = TextBox & {
  score: number;
};

const CARD_CONFIG = {
  // عدد أعمدة الكروت
  columns: 4,

  // أقل/أعلى طول مقبول للكرت
  minCardLength: 5,
  maxCardLength: 32,

  // الهاتف غالباً 9-15 رقم
  phoneMinLength: 9,
  phoneMaxLength: 15,

  // مسافة دمج أجزاء النص المتجاورة
  mergeXGap: 18,

  // تفاوت السطر
  lineTolerance: 6,

  // نستبعد الكلمات القصيرة جداً
  minTokenLength: 4,

  // أقصى عدد نتائج يمكن قبولها من صفحة واحدة
  maxCardsPerPage: 1000,
};

/* =========================================================
   1. تنظيف النص
========================================================= */

function normalizeText(value: string): string {
  if (!value) return "";

  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[|¦]/g, "")
    .replace(/[()[\]{}]/g, "")
    .replace(/[‐-‒–—−]/g, "-")
    .replace(/\s+/g, "")
    .trim();
}

/* =========================================================
   2. تحويل الأرقام العربية والهندية إلى إنجليزية
========================================================= */

function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(d))
    )
    .replace(/[۰-۹]/g, (d) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    );
}

/* =========================================================
   3. استخراج رقم الهاتف
========================================================= */

function isPhoneNumber(value: string): boolean {
  const text = normalizeDigits(normalizeText(value));

  // إزالة رموز الهاتف الشائعة
  const digits = text.replace(/[^\d]/g, "");

  if (
    digits.length < CARD_CONFIG.phoneMinLength ||
    digits.length > CARD_CONFIG.phoneMaxLength
  ) {
    return false;
  }

  // رقم هاتف يجب أن يكون أرقاماً فقط تقريباً
  if (!/^\d+$/.test(digits)) {
    return false;
  }

  // يمنع اعتبار رقم مكرر مثل 000000000 كرقم هاتف
  if (/^(\d)\1+$/.test(digits)) {
    return false;
  }

  return true;
}

/* =========================================================
   4. السعر
========================================================= */

function isPrice(value: string): boolean {
  const text = normalizeDigits(normalizeText(value)).toLowerCase();

  // عملات / كلمات السعر
  if (
    /(?:ريال|ريـال|r?y|yer|sar|price|سعر)/i.test(text)
  ) {
    return true;
  }

  // أمثلة:
  // 200
  // 300
  // 500
  // 200.00
  // 200 ريال
  //
  // السعر غالباً رقم قصير.
  const digits = text.replace(/[^\d]/g, "");

  if (!digits) return false;

  // السعر لا يكون طويلاً مثل رقم الكرت أو الهاتف
  if (digits.length <= 4) {
    return true;
  }

  return false;
}

/* =========================================================
   5. أسماء الشبكة / النصوص العادية
========================================================= */

function isNetworkText(value: string): boolean {
  const text = normalizeText(value).toLowerCase();

  if (!text) return true;

  // كلمات شائعة تظهر على البطاقة وليست كرتاً
  const networkWords = [
    "تواصل",
    "شبكة",
    "شبكه",
    "انترنت",
    "إنترنت",
    "خدمات",
    "الانترنت",
    "الإنترنت",
    "internet",
    "network",
    "wifi",
    "wi-fi",
    "hotspot",
    "mikrotik",
    "login",
    "username",
    "password",
    "user",
    "pass",
    "card",
    "كرت",
    "بطاقة",
    "صلاحية",
    "يوم",
    "ساعات",
    "ساعة",
    "جيجا",
    "ميجا",
  ];

  return networkWords.some((word) => text.includes(word));
}

/* =========================================================
   6. هل النص يمكن أن يكون كرتاً؟
========================================================= */

function looksLikeCard(value: string): boolean {
  let text = normalizeDigits(normalizeText(value));

  if (!text) return false;

  // إزالة المسافات الداخلية للكروت مثل:
  // ABC 123456
  text = text.replace(/\s+/g, "");

  if (
    text.length < CARD_CONFIG.minCardLength ||
    text.length > CARD_CONFIG.maxCardLength
  ) {
    return false;
  }

  // الكرت يجب أن يكون English letters + digits
  //
  // يقبل:
  // ABC12345
  // T123456789
  // 1234567890
  // A987654321
  //
  // ولا يقبل العربي أو الرموز.
  if (!/^[A-Za-z0-9]+$/.test(text)) {
    return false;
  }

  // استبعاد الهاتف
  if (isPhoneNumber(text)) {
    return false;
  }

  // استبعاد السعر
  if (isPrice(text)) {
    return false;
  }

  // استبعاد النصوص المعروفة
  if (isNetworkText(text)) {
    return false;
  }

  /*
   * مهم جداً:
   * لا نطلب وجود حرف.
   *
   * لذلك:
   * 12345678
   * 987654321
   * ABC12345
   * T123456789
   *
   * كلها مسموحة.
   */

  return true;
}

/* =========================================================
   7. تحويل عناصر PDF.js إلى مربعات بإحداثيات
========================================================= */

function convertPdfItems(items: unknown[]): TextBox[] {
  const result: TextBox[] = [];

  for (const raw of items) {
    const item = raw as Partial<PdfTextItem>;

    if (
      typeof item.str !== "string" ||
      !Array.isArray(item.transform) ||
      item.transform.length < 6
    ) {
      continue;
    }

    const text = item.str.trim();

    if (!text) continue;

    const x = Number(item.transform[4] ?? 0);

    const y = Number(item.transform[5] ?? 0);

    const width = Math.abs(Number(item.width ?? 0));

    const height = Math.abs(
      Number(item.height ?? item.transform[3] ?? 0)
    );

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }

    result.push({
      text,
      x,
      y,
      width,
      height,
      centerX: x + width / 2,
      centerY: y,
    });
  }

  return result;
}

/* =========================================================
   8. تجميع أجزاء النص الموجودة في نفس السطر
========================================================= */

function mergeTextBoxes(boxes: TextBox[]): TextBox[] {
  if (boxes.length === 0) return [];

  const sorted = [...boxes].sort((a, b) => {
    if (Math.abs(a.centerY - b.centerY) > CARD_CONFIG.lineTolerance) {
      return b.centerY - a.centerY;
    }

    return a.x - b.x;
  });

  const lines: TextBox[][] = [];

  for (const box of sorted) {
    let target: TextBox[] | undefined;

    for (const line of lines) {
      const reference = line[0];

      if (
        Math.abs(reference.centerY - box.centerY) <=
        CARD_CONFIG.lineTolerance
      ) {
        target = line;
        break;
      }
    }

    if (target) {
      target.push(box);
    } else {
      lines.push([box]);
    }
  }

  const merged: TextBox[] = [];

  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);

    let current: TextBox | null = null;

    for (const box of line) {
      if (!current) {
        current = { ...box };
        continue;
      }

      const currentRight = current.x + current.width;

      const gap = box.x - currentRight;

      if (gap <= CARD_CONFIG.mergeXGap) {
        current.text += box.text;

        const newRight = Math.max(
          currentRight,
          box.x + box.width
        );

        current.width = newRight - current.x;

        current.height = Math.max(
          current.height,
          box.height
        );

        current.centerX =
          current.x + current.width / 2;

        current.centerY =
          (current.centerY + box.centerY) / 2;
      } else {
        merged.push(current);
        current = { ...box };
      }
    }

    if (current) {
      merged.push(current);
    }
  }

  return merged;
}

/* =========================================================
   9. تحديد الأعمدة الأربعة
========================================================= */

function detectColumnCenters(boxes: TextBox[]): number[] {
  if (!boxes.length) return [];

  const xs = boxes
    .map((b) => b.centerX)
    .sort((a, b) => a - b);

  /*
   * نستخدم أربع مجموعات تقريبية.
   * هذا أفضل من تقسيم الصفحة إلى 4 أجزاء ثابتة،
   * لأن هوامش PDF قد تختلف.
   */

  const clusters: number[][] = [];

  for (const x of xs) {
    let nearest: number[] | null = null;
    let nearestDistance = Infinity;

    for (const cluster of clusters) {
      const center =
        cluster.reduce((a, b) => a + b, 0) /
        cluster.length;

      const distance = Math.abs(center - x);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = cluster;
      }
    }

    /*
     * السماح بتجميع العناصر المتقاربة.
     */
    if (nearest && nearestDistance < 130) {
      nearest.push(x);
    } else {
      clusters.push([x]);
    }
  }

  /*
   * إذا أنتجنا أكثر من 4 مجموعات،
   * ندمج الأقرب.
   */
  while (clusters.length > CARD_CONFIG.columns) {
    let bestA = 0;
    let bestB = 1;
    let bestDistance = Infinity;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const a =
          clusters[i].reduce((x, y) => x + y, 0) /
          clusters[i].length;

        const b =
          clusters[j].reduce((x, y) => x + y, 0) /
          clusters[j].length;

        const distance = Math.abs(a - b);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestA = i;
          bestB = j;
        }
      }
    }

    clusters[bestA].push(...clusters[bestB]);
    clusters.splice(bestB, 1);
  }

  return clusters
    .map(
      (cluster) =>
        cluster.reduce((a, b) => a + b, 0) /
        cluster.length
    )
    .sort((a, b) => a - b);
}

/* =========================================================
   10. إيجاد العمود الأقرب
========================================================= */

function getNearestColumn(
  x: number,
  columnCenters: number[]
): number {
  let index = 0;
  let distance = Infinity;

  columnCenters.forEach((center, i) => {
    const d = Math.abs(x - center);

    if (d < distance) {
      distance = d;
      index = i;
    }
  });

  return index;
}

/* =========================================================
   11. حساب درجة احتمال أن يكون العنصر كرتاً
========================================================= */

function scoreCardCandidate(
  box: TextBox,
  pageWidth: number,
  pageHeight: number
): number {
  const value = normalizeDigits(
    normalizeText(box.text)
  ).replace(/\s+/g, "");

  if (!looksLikeCard(value)) {
    return -Infinity;
  }

  let score = 0;

  /*
   * طول مناسب للكرت
   */
  if (value.length >= 8) score += 10;
  if (value.length >= 10) score += 5;
  if (value.length >= 12) score += 3;

  /*
   * وجود حروف + أرقام يعطي غالباً كود كرت.
   */
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) {
    score += 12;
  }

  /*
   * كرت رقمي بالكامل ما زال مقبولاً.
   */
  if (/^\d+$/.test(value)) {
    score += 5;
  }

  /*
   * الكرت عادة لا يكون قريباً جداً من حواف الصفحة.
   */
  const normalizedY =
    pageHeight > 0
      ? box.centerY / pageHeight
      : 0.5;

  if (normalizedY > 0.15 && normalizedY < 0.85) {
    score += 5;
  }

  /*
   * الكرت عادة في منتصف البطاقة،
   * وليس في أعلى/أسفل الصفحة.
   */
  if (normalizedY > 0.25 && normalizedY < 0.75) {
    score += 4;
  }

  return score;
}

/* =========================================================
   12. إزالة التكرار
========================================================= */

function uniqueCards(cards: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const card of cards) {
    const normalized = normalizeDigits(
      normalizeText(card)
    ).replace(/\s+/g, "");

    if (!normalized) continue;

    const key = normalized.toUpperCase();

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(key);
  }

  return result;
}

/* =========================================================
   13. استخراج الكروت من صفحة واحدة
========================================================= */

function extractCardsFromPage(
  items: unknown[],
  pageWidth: number,
  pageHeight: number
): string[] {
  const rawBoxes = convertPdfItems(items);

  if (!rawBoxes.length) {
    return [];
  }

  /*
   * دمج أجزاء النص المتجاورة.
   */
  const boxes = mergeTextBoxes(rawBoxes);

  /*
   * تحديد الأعمدة الأربعة.
   */
  const columnCenters =
    detectColumnCenters(boxes);

  /*
   * مرشح أولي للكروت.
   */
  const candidates: CardCandidate[] = [];

  for (const box of boxes) {
    const normalized =
      normalizeDigits(
        normalizeText(box.text)
      ).replace(/\s+/g, "");

    const score = scoreCardCandidate(
      box,
      pageWidth,
      pageHeight
    );

    if (score === -Infinity) {
      continue;
    }

    candidates.push({
      ...box,
      text: normalized,
      score,
    });
  }

  if (!candidates.length) {
    return [];
  }

  /*
   * =====================================================
   * أهم خطوة:
   *
   * السعر والهاتف قد يبدوان كأرقام صالحة.
   *
   * لذلك لا نأخذ كل الأرقام.
   *
   * نعتمد على توزيعها في الأعمدة وموقعها الرأسي.
   * =====================================================
   */

  const byColumn = new Map<number, CardCandidate[]>();

  for (const candidate of candidates) {
    const column = getNearestColumn(
      candidate.centerX,
      columnCenters
    );

    if (!byColumn.has(column)) {
      byColumn.set(column, []);
    }

    byColumn.get(column)!.push(candidate);
  }

  const selected: CardCandidate[] = [];

  /*
   * كل عمود يعالج بشكل مستقل.
   */
  for (let column = 0; column < CARD_CONFIG.columns; column++) {
    const columnCandidates =
      byColumn.get(column) ?? [];

    if (!columnCandidates.length) continue;

    /*
     * ترتيب من أعلى إلى أسفل.
     */
    columnCandidates.sort(
      (a, b) => b.centerY - a.centerY
    );

    /*
     * إزالة المرشحات القريبة جداً من بعضها.
     * في حال وجود كرت على أكثر من TextItem.
     */
    const accepted: CardCandidate[] = [];

    for (const candidate of columnCandidates) {
      const duplicate = accepted.some(
        (item) =>
          Math.abs(
            item.centerY - candidate.centerY
          ) < 12 &&
          Math.abs(
            item.centerX - candidate.centerX
          ) < 40
      );

      if (duplicate) {
        /*
         * نحتفظ بالأعلى درجة.
         */
        const existingIndex =
          accepted.findIndex(
            (item) =>
              Math.abs(
                item.centerY -
                  candidate.centerY
              ) < 12 &&
              Math.abs(
                item.centerX -
                  candidate.centerX
              ) < 40
          );

        if (
          existingIndex >= 0 &&
          candidate.score >
            accepted[existingIndex].score
        ) {
          accepted[existingIndex] = candidate;
        }

        continue;
      }

      accepted.push(candidate);
    }

    selected.push(...accepted);
  }

  /*
   * =====================================================
   * استبعاد الهاتف والسعر بشكل إضافي.
   * =====================================================
   */

  const filtered = selected.filter((candidate) => {
    const value = candidate.text;

    if (isPhoneNumber(value)) {
      return false;
    }

    if (isPrice(value)) {
      return false;
    }

    /*
     * لا نقبل أرقاماً قصيرة جداً.
     */
    if (/^\d+$/.test(value)) {
      if (value.length < 6) {
        return false;
      }
    }

    return looksLikeCard(value);
  });

  /*
   * ترتيب حسب موقع القراءة:
   * أعلى -> أسفل
   * ثم من اليسار -> اليمين
   */
  filtered.sort((a, b) => {
    const yDiff =
      Math.abs(a.centerY - b.centerY);

    if (yDiff > 20) {
      return b.centerY - a.centerY;
    }

    return a.centerX - b.centerX;
  });

  return uniqueCards(
    filtered
      .slice(0, CARD_CONFIG.maxCardsPerPage)
      .map((item) => item.text)
  );
}

/* =========================================================
   14. استخراج الكروت من PDF كامل
========================================================= */

export async function extractCardsFromPDF(
  file: File
): Promise<string[]> {
  if (!file) {
    throw new Error("لم يتم اختيار ملف PDF.");
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("الملف المحدد ليس PDF.");
  }

  const arrayBuffer =
    await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  }).promise;

  const allCards: string[] = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page =
      await pdf.getPage(pageNumber);

    const viewport =
      page.getViewport({ scale: 1 });

    const textContent =
      await page.getTextContent({
        includeMarkedContent: false,
      });

    const pageCards =
      extractCardsFromPage(
        textContent.items,
        viewport.width,
        viewport.height
      );

    allCards.push(...pageCards);
  }

  /*
   * إزالة التكرار من جميع صفحات الملف.
   */
  return uniqueCards(allCards);
}

/* =========================================================
   15. دالة متوافقة مع استيراد PDF الحالي
========================================================= */

export async function parseCardsFromPDF(
  file: File
): Promise<string[]> {
  return extractCardsFromPDF(file);
}
