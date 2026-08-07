import * as pdfjsLib from 'pdfjs-dist';

// ضبط الـ Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractCardsFromPDF(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // تحميل الـ PDF مع إسناد الـ cMaps لتفكيك خطوط الكروت المشفرة
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
    });
    
    const pdfDocument = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
        
      fullText += pageText + ' ';
    }

    // فلترة الأرقام والرموز فقط (استبعاد كافة الشفرات والرموز الغريبة)
    // يقبل الأرقام المكونة من 7 إلى 12 رقم
    const rawMatches = fullText.match(/\b\d{7,12}\b/g) || [];

    // تنقية النتائج: إزالة التكرار واستبعاد أرقام الهواتف (مثل أرقام يمن موبايل 77xxxxxxx)
    const validCards = Array.from(new Set(rawMatches)).filter(code => {
      const isPhoneNumber = /^77\d{7}$/.test(code);
      return !isPhoneNumber;
    });

    return validCards;
  } catch (error) {
    console.error("خطأ في تحليل PDF:", error);
    throw new Error("تعذر استخراج الكروت من هذا الملف.");
  }
}
