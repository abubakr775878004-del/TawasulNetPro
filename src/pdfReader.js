import * as pdfjsLib from 'pdfjs-dist';

// ضبط الـ Worker الخاص بالمكتبة
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractCardsFromPDF(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
    });

    const pdfDocument = await loadingTask.promise;
    let extractedCards: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // تجميع النصوص وتنظيفها
      const pageStrings = textContent.items
        .map((item: any) => item.str.trim())
        .filter((str: string) => str.length > 0);

      const fullText = pageStrings.join(' ');

      // التعبير النمطي الجديد (Regex):
      // [a-zA-Z]? يضمن قراءة كرت يبدأ بحرف إنجليزي (كبير أو صغير) أو بدون حرف
      // \d{7,10} يضمن قراءة باقي الرقم المكون من 7 إلى 10 أرقام
      const allMatches = fullText.match(/\b[a-zA-Z]?\d{7,10}\b/g) || [];

      allMatches.forEach((code) => {
        // 1. استبعاد أرقام الهواتف (مثل 775878004 أو التي تبدأ بـ 077/77)
        const isPhoneNumber = /^0?77\d+$/.test(code) || code.includes('775878004');
        
        // 2. استبعاد أسعار الباقات المعتادة
        const isPrice = ['500', '200', '300', '400', '1000'].includes(code);

        // 3. التحقق من الكرت (سواء كان أرقام فقط مثل 026336456 أو بحرف مثل A026336456 أو a026336456)
        if (!isPhoneNumber && !isPrice && code.length >= 7) {
          if (!extractedCards.includes(code)) {
            extractedCards.push(code);
          }
        }
      });
    }

    return extractedCards;
  } catch (error) {
    console.error("خطأ أثناء استخراج الكروت من الـ PDF:", error);
    throw new Error("تعذر قراءة الكروت من هذا الملف، تأكد من صحة الملف.");
  }
}
